# Audit Batch 2 — Implementation Plan

Covers items **2 (logging/monitoring), 3 (print XSS), 5 (dead code)** from
[audit-remediation-plan.md](audit-remediation-plan.md). Written 2026-07-10,
after batch 1 (AI endpoint auth + rate limiting, PR #19) shipped to production.

These three are batched deliberately: remove dead code first so we don't
instrument endpoints that are about to be deleted, then overhaul logging,
with the small XSS fix riding along.

Workflow: branch `fix/audit-batch2` off `dev` → PR → merge to dev → verify on
the deployed dev backend/frontend → production on user go-ahead.

---

## Workstream A — Self-XSS in print (item 3, do first: small + confirmed)

**Where:** `frontend/src/App.tsx` — print handler around lines 1279–1312
(grep `printWindow` / `document.write`; line numbers drift).

**Problem:** the shopping-list print handler builds an HTML string from item
names/quantities/units and calls `printWindow.document.write(html)`. Item
names are user- and AI-supplied → script injection into the print window.

**Fix:**
1. Add `frontend/src/lib/escapeHtml.ts`:
   ```ts
   export const escapeHtml = (s: string): string =>
     s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
   ```
2. Apply it to **every** interpolated value in the print HTML (names,
   quantities, units, any translated section headers).
3. Sweep for other sinks: `document.write`, `innerHTML`,
   `dangerouslySetInnerHTML` across frontend/src. Known: App.tsx ~2241 sets
   `instructions.innerHTML` to a **static** string — fine, leave it, but
   confirm it's still static.

**Verify:** add a pantry/shopping item named
`<img src=x onerror=alert(1)>x` and print — the name must render as literal
text, no dialog. No i18n changes needed (no new user-visible strings).

---

## Workstream B — Dead code & API surface (item 5)

Verify each before deleting (grep both `API_BASE` **and** `VITE_API_URL` —
see the donation.py correction in the main plan doc for why):

- `backend/app/models/schemas.py` — no imports found anywhere. Delete.
- `backend/test.py` — scratch file. Delete.
- `frontend/src/services/recipeService.ts` — `fetchRecipes()` and the Amazon
  affiliate/budget helpers are unused (verify); only the `Recipe` type is
  imported (RecipeList.tsx, RecipeCard.tsx). Delete the dead functions; move
  the `Recipe` type to `frontend/src/types/` (or keep the file type-only).
- App.tsx demo/sample data blocks (~line 1550) — verify unused, then delete.
- `backend/app/routers/donation.py` — **KEEP. It is live** (App.tsx donation
  modal). Do not remove.
- `GET /vision/test` (vision.py) — trivial debug endpoint, no caller. Delete.

**Verify:** `tsc --noEmit`, pytest, uvicorn boots, grep confirms no
references to deleted symbols.

---

## Workstream C — Backend logging & monitoring overhaul (item 2)

This closes the audit's whole "Logging & Monitoring" section plus the
request-limits/timeout/retry mediums. Backend logs go to stdout — Render
captures them (view via `/v1/services/{id}/logs`, see render-access memory).

### C1. Logging setup
- New `backend/app/services/logging_config.py`: `logging.basicConfig`-style
  setup called once from `app/main.py`. Single-line structured format, e.g.
  `%(asctime)s %(levelname)s %(name)s [req=%(request_id)s] %(message)s`,
  level from `LOG_LEVEL` env (default INFO). Use a logging Filter to inject
  `request_id` from a `contextvars.ContextVar` (empty string outside requests).
- Request-ID middleware in main.py: uuid4 per request, set the contextvar,
  echo back as `X-Request-ID` response header. Log one line per request at
  INFO: method, path, status, duration_ms, user_id (uuid, set by
  `get_current_user` on `request.state`; `-` when unauthenticated).

### C2. Replace print() with loggers
27 `print()` calls across 8 files (`grep -rn "print(" backend/app`):
barcode (10), profile (6), recipes (4), shopping (3), vision, pantry,
recipe_parser, openai_client (1 each). Each file gets
`logger = logging.getLogger(__name__)`. Mapping: happy-path chatter → DEBUG
or delete; fallbacks/recoverable → WARNING; caught exceptions → ERROR with
`exc_info=True`.

**PII rules:** never log tokens, emails, or prompt/response bodies at INFO
(DEBUG only, truncated). user_id (uuid) is OK — it's needed for debugging.
delete_account's per-table prints become DEBUG; keep one INFO line
("account deleted user=<uuid>") for the audit trail.

### C3. Auth events
In `app/services/auth.py`: log WARNING on failed validation (reason: missing
header / bad format / invalid token — never the token itself), DEBUG on
success. Log rate-limit 429s at WARNING with user id (slowapi's handler can
be wrapped, or log from a custom handler in main.py).

### C4. OpenAI latency, usage & cost
- `call_chat_completion` (openai_client.py): time the call; parse the
  `usage` field from the response (currently discarded); log INFO:
  `model, duration_ms, prompt_tokens, completion_tokens, est_cost_usd`.
  Cost table as a module dict (gpt-4o-mini and gpt-4o entries; per-1M-token
  prices as consts — check current OpenAI pricing when implementing).
- vision.py and barcode.py call the OpenAI SDK directly (gpt-4o). Wrap those
  call sites with the same timing+usage logging — either a small shared
  helper in openai_client.py (`log_openai_usage(model, duration, usage)`) or
  refactor them onto a shared client. Minimum bar: every OpenAI call logs
  model, latency, tokens, est. cost with request-id context.

### C5. Timeouts & retries
- openai_client.py: keep 90s read timeout but set explicit
  `httpx.Timeout(connect=10, read=90, write=30, pool=10)`; add retry (max 2,
  exponential backoff) on connect errors, timeouts, 429 and 5xx. Simple
  loop is fine — no new dependency needed.
- vision/barcode SDK clients: pass `timeout=90, max_retries=2` to
  `OpenAI(...)` (SDK supports both).
- Open Food Facts call in barcode.py already has timeout=5; add 1 retry.

### C6. Request size limits
- Pydantic field constraints on AI request models (doubles as item 6 head
  start): ingredients ≤ 30 items × ≤ 200 chars; `lines` ≤ 100 × ≤ 300 chars;
  `names` ≤ 50; dietary-label `text` ≤ 500 chars; barcode string ≤ 32;
  base64 `image` ≤ ~10 MB chars; recipes list for translate-full ≤ 10;
  price-comparison items ≤ 100. Use `Field(max_length=...)` /
  `max_items` (`max_length` for lists in Pydantic v2).
- vision upload: after `await file.read()`, reject > 8 MB with 413.
- 422/413 responses must not echo the oversized payload back.

### Tests (extend backend/test_auth.py pattern)
- Request-ID header present on responses; same id appears in the request log
  line (capture with `caplog`).
- Oversized payload → 422 (one representative route) ; oversized image → 413.
- `call_chat_completion` retry: mock httpx to fail once then succeed.
- Existing 14 tests must stay green.

### Deploy verification
After merge to dev: hit the dev backend, then pull Render logs
(`/v1/services/srv-d7bc0gh17lss73922p6g/logs`) and confirm structured lines
with request ids and an OpenAI usage/cost line appear. Tokenless 401 sweep
still passes.

---

## Explicitly out of scope (later batches)
- Item 4: React stale-closure/race fixes + eslint-plugin-react-hooks (pairs
  with item 7 CI).
- Item 6: full Pydantic validation beyond the size caps above.
- Item 7: CI quality gates (tsc, eslint, pytest on PRs).
- Frontend 429 "slow down" toast (needs i18n in 6 languages).
