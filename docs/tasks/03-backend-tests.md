# 03 — Close Backend Test Gaps + Frontend Test Baseline

**Priority:** 🔴 Critical
**Effort:** M (1-2 days)
**Status:** NOT STARTED

## Problem

The original claim ("zero automated tests") is false — verified:
`backend/` already has `test_auth.py`, `test_profile.py`,
`test_observability.py`, `test_receipt_scanner.py`, `test_validation.py`,
and `.github/workflows/ci.yml` runs them plus frontend typecheck/lint on
every PR. What's actually missing:

- **No tests at all for `pantry.py`, `shopping.py`, or `donation.py`** —
  confirmed no `test_pantry*`, `test_shopping*`, `test_donation*` files
  exist. These are exactly the routers involved in the [task 01](01-pantry-persistence.md)
  migration, so tests here should land *before or alongside* that work.
- **Zero frontend tests** — no `*.test.*`/`*.spec.*` files anywhere in
  `frontend/src`, and no test runner configured (`ci.yml`'s frontend job
  only does typecheck + lint, no `npm test` step). This task adds the
  baseline; broader component coverage is [task 14](14-frontend-test-coverage.md).

## Implementation

### Backend

Follow the existing style in `test_auth.py`/`test_profile.py`: mock-based,
override `get_current_user` via `app.dependency_overrides`, run with
`pytest` from `backend/`.

- `test_pantry.py` — once [task 01](01-pantry-persistence.md) lands, cover:
  CRUD scoped to the authenticated user, the cross-user isolation
  regression test (two mock users, confirm no leakage), `match-ingredients`
  with a mocked OpenAI call.
- `test_shopping.py` — same shape, plus a case for
  `ai-price-comparison` covering the determinism fix in
  [task 05](05-price-comparison-determinism.md).
- `test_donation.py` — donation.py is live (221 lines) and untested; cover
  its actual endpoints (read the file first, don't assume shape).

### Frontend

- Add Vitest + React Testing Library (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`).
- `vite.config.ts` — add a `test` block (`environment: 'jsdom'`).
- Add `"test": "vitest run"` to `package.json` scripts.
- Baseline coverage only for this task (broader coverage is task 14):
  - One smoke test that the app renders without crashing.
  - One test for `ErrorBoundary` (from [task 02](02-error-boundaries.md)) —
    confirms it catches and renders fallback rather than crashing.
- Add the `npm test` step to `.github/workflows/ci.yml`'s frontend job.

## Verification

- [ ] `pytest` from `backend/` green, including new pantry/shopping/donation
      tests
- [ ] `npm test` from `frontend/` green
- [ ] `ci.yml` runs both and fails the PR check if either fails (confirm by
      pushing a deliberately failing test to a scratch branch and watching
      the Actions run go red, then revert)
