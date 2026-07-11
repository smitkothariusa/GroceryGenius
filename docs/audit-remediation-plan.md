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

### 1. ✅ Auth + rate limiting on AI endpoints (audit critical #5 — done 2026-07-10)
Shipped via `fix/ai-endpoint-auth`:
- Shared `Depends(get_current_user)` in `backend/app/services/auth.py`
  (validates Supabase JWT via `sb_anon.auth.get_user`; 401 on missing/bad
  token). Applied router-wide to recipes, vision, barcode, pantry, shopping,
  donation; `profile.py` uses it per-route (`dietary-label` was also
  unauthenticated OpenAI — now covered; `delete_account` refactored onto it).
- Per-user rate limiting (slowapi, keyed on user id, IP fallback):
  10/min on heavy routes (recipe gen, translate-full, vision, price
  comparison), 30/min on light ones (barcode, parse/match, translate-names,
  dietary-label). Limits live in `app/services/auth.py`.
- Frontend sends the session token via `authFetch` (`frontend/src/lib/apiClient.ts`)
  on all `API_BASE` calls (App.tsx, MealPlanCalendar, OnboardingSurvey;
  SettingsPanel already attached it manually).
- Also fixed: `vision.py` built its OpenAI client at import time, crashing
  any import of `app.main` without `OPENAI_API_KEY`; now created per-request.
- Tests: `backend/test_auth.py` (dependency, tokenless-401 sweep across all
  routes, 429 after limit); `test_profile.py` updated for the refactor.

> **Items 2, 3, and 5 were batched and shipped 2026-07-10 (PR #21, "batch2")
> — detailed spec in [audit-batch2-plan.md](audit-batch2-plan.md).**

### 2. ✅ Backend logging overhaul (audit "Logging & Monitoring" section) — done 2026-07-10
Replaced ad-hoc `print()` with structured Python `logging`: request IDs, auth
events, OpenAI latency + token usage/cost tracking, PII scrubbing, request
size limits, and timeout/retry handling on the OpenAI httpx calls. Shipped in
PR #21 (`fix/audit-batch2`).

### 3. ✅ Self-XSS in print functionality — done 2026-07-10
`frontend/src/App.tsx` shopping-list print handler now escapes HTML entities
for every interpolated item name before `printWindow.document.write(html)`.
Shipped in PR #21.

### 4. ✅ React state issues — done 2026-07-11 (PR #22, `feature/audit-batch3-hooks`)
- Added `eslint-plugin-react-hooks` (flat config, scoped to
  `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps`; no linter
  existed before this) and fixed all 10 violations it surfaced for real (no
  disables). `npm run lint` in `frontend/` now gates CI (item 7).
- One genuine `rules-of-hooks` violation found in `TourOverlay.tsx` (an early
  `return null` sat between two `useEffect` calls) — this is very likely the
  audit's unreproducible "hooks violation causing runtime crashes": it only
  fired on the transient render where `steps[currentStep]` was undefined.
- Two concrete stale-closure/race bugs fixed by inspection beyond what eslint
  caught:
  1. `App.tsx` Supabase auth listener — a `SIGNED_IN` handler closed over
     `user` from mount time (always `null`), so its guard never filtered,
     and the stale `loadUserData()` it invoked threw internally on
     `user.id`, silently swallowing the profile/calorie-goal load on every
     real sign-in, while racing a second correct `loadUserData()` call from
     a separate effect. Fixed with a request-token ref so stale in-flight
     responses can no longer clobber fresher state.
  2. `MealPlanCalendar.tsx` `handleToggleComplete` — marking a second meal
     complete while a first `/pantry/match-ingredients` request was still in
     flight let the first response's late `setDeductModal` overwrite the
     second meal's modal. Fixed by gating the response application on the
     modal still showing the request's meal.

### 5. ✅ Dead code & API surface cleanup — done
- `backend/app/models/schemas.py` and `backend/test.py`: confirmed already
  absent from the repo as of 2026-07-11 (removed in an earlier batch).
- `frontend/src/services/recipeService.ts`'s dead `fetchRecipes()`: see batch2
  notes in [audit-batch2-plan.md](audit-batch2-plan.md).
- `donation.py` is LIVE — see the correction below (unchanged, kept for the
  grep-`VITE_API_URL`-not-`API_BASE` lesson).
- ~~`backend/app/routers/donation.py` — no frontend call site found~~
  **CORRECTION 2026-07-10: donation.py is LIVE.** App.tsx ~line 301 calls
  `/donation/calculate-impact` via an *inline* `VITE_API_URL` fetch (not the
  `API_BASE` variable), which is why the original grep missed it. Lesson:
  grep `VITE_API_URL`, not `API_BASE`, when hunting backend call sites.
  (This briefly broke the donation modal when auth shipped — fixed same day
  by switching the call to `authFetch`.)

### 6. ✅ Pydantic request validation — done 2026-07-11 (PR #24, `feature/audit-batch3-validation`)
Added `min_length`/non-empty constraints, numeric range (`ge`/`le`) bounds,
and list-size caps across request models in `barcode.py`, `pantry.py`,
`shopping.py`, `donation.py`, `recipes.py`, `profile.py`. Replaced
`shopping.py`'s untyped `List[dict]` price-comparison payload with a typed
`PriceItem` model. `TranslateFullRecipesRequest.recipes` stays `List[dict]`
(it round-trips arbitrary client-supplied Recipe fields) but now has a
`field_validator` capping dict size/shape. Covered by 22 new tests in
`backend/test_validation.py` (41 total passing).

### 7. ✅ CI quality gates — done 2026-07-11 (PR #23, `feature/audit-batch3-ci`)
`.github/workflows/ci.yml` runs on PRs/pushes to main+dev: frontend
`tsc --noEmit` + `npm run lint` (item 4's rules), backend `pytest`. Verified
locally pre-merge that each gate actually fails on a real violation (not just
that the YAML parses), and confirmed green on the real PR runs for #23-#25.

## Extra (not from the audit, done alongside batch3)
- ✅ Frontend 429 "slow down" toast — done 2026-07-11 (PR #25). Backend
  AI-endpoint rate limiting (item 1) had no user-facing feedback; added a
  `rateLimitBridge.ts` pub/sub so `authFetch` can signal a 429 without
  rewriting every call site, debounced 5s, with a `toasts.rateLimited` key
  translated in all 6 locales.

## Status: all tracked audit items closed as of 2026-07-11
Batch3 (PRs #22-#25) merged to `dev` and verified deployed there (Vercel
frontend cloned commit confirmed via `vercel inspect`; Render backend
confirmed `live` at the deploy containing the validation changes; `/health`
200, AI routes 401 without a token). **Released to production 2026-07-11**
(main merge commit b530c43) — verified via Render deploy API (commit
b530c43, status `live`) and `/health` 200 / tokenless-401 on
`grocerygenius-api.onrender.com`.

## Standing deferred items (from user-feedback triage, not this audit)
- Protein/fiber tracking + goals; low-glycemic diet option
- Receipt scanning (tesseract.js already a frontend dependency)
