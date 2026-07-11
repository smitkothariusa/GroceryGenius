# GroceryGenius Implementation Plan

Tracked backlog for subagent-driven development. Each task links to a full
spec in `docs/tasks/`. This file should stay short — status + one-liners
only; implementation detail lives in the spec files.

Workflow for each task: `.claude/skills/implement-task/SKILL.md`
(invoke with `/implement-task`).

## Current Task

**[6 — Refactor App.tsx into feature modules](docs/tasks/06-app-tsx-refactor.md)**
— IN PROGRESS as of 2026-07-11, kicked off per explicit user go-ahead.
Per the spec's recommended extraction order, doing this as a sequence of
small PRs rather than one giant change: Favorites → MealPlanCalendar wiring
→ Donation → Recipes → Scanning+Pantry (last, most entangled). First step:
Favorites extraction.

Tasks 03, 12, 13, 15 (PRs #39–#42) and **9, 14, 16, 17 (PRs #44–#47)** are
**all released to production** as of 2026-07-11 (main 728ecc2) — verified
live on grocerygenius.org / grocerygenius-api.onrender.com (health check,
99 backend tests, 26 frontend tests, auth-required smoke test).

**Also shipped straight to production this session (unplanned, urgent):** a
service-worker reload loop (`frontend/index.html` fighting `main.tsx`'s SW
registration on every page load) was breaking sign-in on mobile Safari —
diagnosed, fixed, and released same-day (main 645646d) per explicit
user go-ahead. See git history for `fix: stop index.html from
unregistering the live service worker every load`.

**Release-policy note (2026-07-11, see CLAUDE.md Git Workflow #1):** for
non-feature `dev` changes (bug fixes, backend logic, refactors, tests,
config) the user has given standing approval to release to `main` at ≥95%
confidence without waiting for the explicit phrase each time. New
user-facing features still wait for the user to try them on dev first.

10 (CI required status checks) applied directly via `gh api` to both `dev`
and `main` — no code change, no PR. 6's stub spec was fleshed out with a
section-boundary map (research-only, no extraction yet). 7/8 (Redis)
explicitly skipped this session per user decision — not needed at current
single-instance scale. Still gated: 18/19/20 (product/schema sign-off
needed before implementation), 7/8 (revisit if scaling or cost pressure
changes the calculus).

---

## Backlog

### 🔴 Critical

| # | Task | Effort | Status | Spec |
|---|---|---|---|---|
| 1 | Pantry & Shopping persistence + per-user isolation | L (2-3d) | DONE | [spec](docs/tasks/01-pantry-persistence.md) |
| 2 | Add error boundaries to frontend | S (0.5d) | DONE | [spec](docs/tasks/02-error-boundaries.md) |
| 3 | Close backend test gaps (pantry/shopping/donation) + frontend test baseline | M (1-2d) | DONE | [spec](docs/tasks/03-backend-tests.md) |
| 4 | Validate image uploads before sending to OpenAI | S (0.5d) | DONE | [spec](docs/tasks/04-image-upload-validation.md) |
| 5 | Fix price comparison non-determinism (temp 0.8→0.3) | S (few hrs) | DONE | [spec](docs/tasks/05-price-comparison-determinism.md) |

### 🟠 High

| # | Task | Effort | Status | Spec |
|---|---|---|---|---|
| 6 | Refactor App.tsx into feature modules | XL (multi-day) | IN PROGRESS | [spec](docs/tasks/06-app-tsx-refactor.md) |
| 7 | Redis-backed rate limiting for multi-instance | M (1d) | NOT STARTED | [spec](docs/tasks/07-redis-rate-limiting.md) |
| 8 | Recipe caching (Redis, 24h TTL) | M (1d) | NOT STARTED | [spec](docs/tasks/08-recipe-caching.md) |
| 9 | Investigate & fix pantry expiry boundary logic | S (0.5d) | DONE | [spec](docs/tasks/09-pantry-expiry-boundary.md) |
| 10 | Enforce CI as a required status check on dev/main | S (1-2h) | DONE | [spec](docs/tasks/10-ci-branch-protection.md) |
| 11 | Offline support (PWA service worker + sync queue) | L (2-3d) | NOT STARTED | [spec](docs/tasks/11-offline-support.md) |
| 12 | Request deduplication (prevent double-submit) | S (0.5d) | DONE | [spec](docs/tasks/12-request-deduplication.md) |
| 13 | Centralize ingredient parsing logic | M (1d) | DONE | [spec](docs/tasks/13-ingredient-parsing.md) |
| 14 | Expand frontend test coverage (component-level) | M (1-2d) | DONE | [spec](docs/tasks/14-frontend-test-coverage.md) |
| 15 | Structured cost/usage logging for OpenAI calls | M (1d) | DONE | [spec](docs/tasks/15-openai-cost-logging.md) |

### 🟡 Medium

| # | Task | Effort | Status | Spec |
|---|---|---|---|---|
| 16 | Health check endpoint dependency checks | S (0.5d) | DONE | [spec](docs/tasks/16-health-check-deps.md) |
| 17 | Pagination for pantry/shopping lists | S (0.5d) | DONE | [spec](docs/tasks/17-pagination.md) |
| 18 | Weekly meal calendar feature | L (2-3d) | NOT STARTED | [spec](docs/tasks/18-meal-calendar.md) |

### 🟢 Low

| # | Task | Effort | Status | Spec |
|---|---|---|---|---|
| 19 | Allergen cross-checking | M (1-2d) | NOT STARTED | [spec](docs/tasks/19-allergen-checking.md) |
| 20 | Soft delete for accounts (30-day grace period) | M (1d) | NOT STARTED | [spec](docs/tasks/20-soft-delete-accounts.md) |

---

## Notes on deviations from the original audit list

Several items in the source list didn't hold up against the current code and were corrected:

- **"Donation router crashes on import"** — false. `donation.py` exists
  (221 lines), is registered in `main.py`, and is confirmed live (see
  CLAUDE.md gotchas). Dropped; replaced with image upload validation, which
  is real (`vision.py` accepts `UploadFile` with no MIME/size check).
- **"Zero automated backend tests"** — false. `backend/` has 5 test files
  (`test_auth.py`, `test_profile.py`, `test_observability.py`,
  `test_receipt_scanner.py`, `test_validation.py`). Reframed as closing
  coverage gaps (pantry/shopping/donation routers are untested) plus adding
  a frontend baseline, since frontend has zero tests.
- **"No CI/CD pipeline"** — false. `.github/workflows/ci.yml` runs
  typecheck/lint/pytest on every PR to `dev`/`main`. What's actually
  missing, verified via `gh api .../branches/dev/protection` → 404: CI
  isn't a *required* check, so a red CI run doesn't block merging. Reframed
  as task 10.
- **Pantry expiry off-by-one** — the current code
  (`0 <= days_until_expiry <= 3`) already includes day 0. Kept in the
  backlog but reframed as "investigate" rather than assuming the bug as
  described exists — write a failing test first before changing behavior.
