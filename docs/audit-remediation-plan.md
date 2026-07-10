# Technical Audit Remediation Plan

Source: external code-audit report received 2026-07-10. Every claim below was
verified against the codebase before being accepted (the original report had no
file references). Status legend: ✅ done · 🔲 open.

## Verification notes (read before working an item)

- The audit's five "criticals" verified as follows: 4 confirmed, 1 unverified.
- **"Hardcoded API tokens/keys" was a false positive** — the only committed
  credential was the Supabase **anon** key in `frontend/.env.production`,
  which is public by design (it ships in the client bundle). No service-role
  or OpenAI keys were ever committed. File removed from git anyway (2026-07-10).
- **"React Hooks violation causing runtime crashes" could not be reproduced.**
  All 96 hook calls in App.tsx sit above the early `return <Auth/>` at
  ~line 2802; heuristic scans found no conditional hooks. See item 7 for the
  durable fix (eslint-plugin-react-hooks in CI); ask the auditor for a repro.

## Completed 2026-07-10 (PR: fix/audit-criticals)

- ✅ OpenAI key prefix no longer printed to logs
  (`backend/app/services/openai_client.py` logged `key[:10]` at import time).
- ✅ CORS wildcard removed (`backend/app/main.py` had `"*"` +
  `allow_credentials=True`); now explicit origins + regex for Vercel previews.
- ✅ Account-deletion integrity (audit critical #3): **verified NOT an issue.**
  All 10 user tables already have FKs to `auth.users` — 8 with ON DELETE
  CASCADE; `feedback` and `error_logs` with ON DELETE SET NULL (deliberate:
  keeps anonymized telemetry). The endpoint's final `auth.admin.delete_user()`
  therefore removes/anonymizes everything regardless of its table list.
  Pitfall for future sessions: `information_schema` **hides** FKs that
  reference `auth.users` (privilege filtering) — query `pg_constraint`
  instead. A redundant cascade migration was briefly added and removed the
  same day when this was discovered.
- ✅ Removed committed `frontend/.env.production` (values live in Vercel env
  vars, confirmed present); `.gitignore` now has `.env*`.
- ✅ Deleted dead duplicates: `backend/app/models/openai_service.py`,
  `backend/app/services/openai_service.py` (identical, neither imported),
  `backend/app/app.txt`.

## Open items, highest priority first

### 1. 🔴 Auth + rate limiting on AI endpoints (audit critical #5 — confirmed)
`backend/app/routers/recipes.py`, `vision.py`, `barcode.py`, `pantry.py`,
`shopping.py`, `donation.py` have **zero authentication** — anyone can call
`POST /recipes` and burn OpenAI budget. Plan:
- Add a FastAPI dependency that validates the Supabase JWT from the
  `Authorization` header (same pattern `profile.py:delete_account` already
  uses via `sb_anon.auth.get_user(token)`; extract into a shared
  `Depends(get_current_user)` in `app/services/`).
- Frontend must then send the session token on `API_BASE` fetches — call
  sites: App.tsx lines ~709/970 (recipes), ~1519/2435 (vision), ~1713/1785
  (barcode), ~2567 (shopping); MealPlanCalendar.tsx ~379/509.
- Add rate limiting (slowapi) per user/IP on the OpenAI-backed routes.
- **Blocker: the backend deploys on Render and no Render CLI/API access is
  set up** (see memory: dev-environment-clis). Get dashboard/CLI access or
  have the user smoke-test after deploy. Test locally with uvicorn first;
  `backend/test_profile.py` shows the existing mock-based test pattern.

### 2. 🟠 Backend logging overhaul (audit "Logging & Monitoring" section)
Replace ad-hoc `print()` (typical of every router) with Python `logging`:
request IDs, auth events, OpenAI latency + token usage/cost tracking, and
scrub PII (delete_account currently prints user_id). Also add request
size limits and timeout/retry handling on the OpenAI httpx calls
(`openai_client.py` has a 90s timeout, no retries).

### 3. 🟠 Self-XSS in print functionality (confirmed)
`frontend/src/App.tsx` ~line 1230-1305: shopping-list print handler builds an
HTML string from item names and calls `printWindow.document.write(html)`.
Item names are user/AI-supplied → script injection into the print window.
Escape HTML entities for every interpolated value (small shared helper).

### 4. 🟡 React state issues (audit claims, need per-case verification)
- Stale closures / race conditions: audit gave no locations. Known suspects:
  fire-and-forget async handlers in App.tsx that `setState` after awaits
  without cancellation; `loadUserData` runs several sequential awaits.
- Durable fix for this whole class: add eslint + `eslint-plugin-react-hooks`
  + `react-hooks/exhaustive-deps` and fix what it flags (also covers the
  unverified "hooks violation" critical). No linter exists in the repo today.

### 5. 🟡 Dead code & API surface cleanup
- `backend/app/models/schemas.py` — not imported anywhere; likely dead.
- `backend/app/routers/donation.py` — no frontend call site found
  (`API_BASE}/donation` appears nowhere in frontend/src); verify then remove
  or document.
- `backend/test.py` — scratch file at repo root of backend.
- Frontend demo/sample data blocks in App.tsx (~line 1550) — verify unused.

### 6. 🟡 Pydantic request validation
Some routers parse raw dicts (recipes.py takes `ingredients` from body without
a model). Add Pydantic request models with field constraints
(max lengths, list size caps — doubles as request-size limiting).

### 7. 🟢 CI quality gates
No lint/typecheck/test runs anywhere (no GitHub Actions workflows for code
quality). Add: `tsc --noEmit`, eslint (see item 4), `pytest backend`, and
optionally `supabase db lint` on PRs to dev.

## Standing deferred items (from user-feedback triage, not this audit)
- Protein/fiber tracking + goals; low-glycemic diet option
- Receipt scanning (tesseract.js already a frontend dependency)
