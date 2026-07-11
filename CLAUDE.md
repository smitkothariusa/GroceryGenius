# GroceryGenius — Claude Code Instructions

A multilingual (6-language) grocery and meal-planning PWA.
React/Vite frontend + FastAPI backend + Supabase (auth, Postgres, RLS).

## Architecture Map

| Piece | Where | Notes |
|---|---|---|
| Frontend | `frontend/` (React 18, Vite, TS) | `App.tsx` is a ~7700-line monolith — **grep it, don't read it whole** |
| Backend | `backend/app/` (FastAPI) | Routers: recipes, vision, barcode, pantry, shopping, donation, profile |
| Auth | Supabase JWT | Backend: `app/services/auth.py` → `Depends(get_current_user)`. Frontend: `lib/apiClient.ts` → `authFetch` |
| DB | Supabase project `sgfhlerngtjkhrzztwhp` | Frontend talks to Supabase directly (`lib/supabase.ts`, `lib/database.ts`); backend is mostly stateless AI endpoints |
| AI | OpenAI (gpt-4o-mini via `services/openai_client.py`; gpt-4o SDK calls in vision/barcode) | All AI routes require auth + slowapi rate limits |

## Git Workflow (STRICT — DO NOT DEVIATE)

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production only | grocerygenius.org + grocerygenius-api.onrender.com |
| `dev` | Integration | dev.grocerygenius.org + grocerygenius-dev.onrender.com |
| `feature/*`, `fix/*` | Work branches off `dev` | Vercel preview URLs |

1. **NEVER push to `main`** unless the user explicitly says so in that turn —
   phrases like "push to main", "merge to main", "deploy to production",
   "ship it", "release it", "go live", "deploy prod", or an unambiguous
   equivalent all count. The authorization is per-instance, not standing —
   it must be said fresh each time, not inferred from a past conversation.
2. Default branch for all work is `dev`. Features/fixes: branch off `dev`,
   PR back to `dev`. Docs-only changes may commit directly to `dev`.
3. Merging your own PR into `dev` is standing authorization — no need to ask
   first or wait for a go-ahead. `main` is the only branch that needs the
   explicit release phrase (see #1).
4. Never force-push `main` or `dev`. Never `--no-verify`.
5. Production release (user-initiated only):
   `git checkout main && git pull && git merge dev --no-ff && git push origin main`

## Deployments & Verification

- **Vercel** builds the frontend from every branch. Gotcha: anonymous curl to
  dev.grocerygenius.org returns a Vercel SSO page, not the app. Verify what's
  deployed with `vercel inspect https://<domain> --logs` and read the
  `Cloning ... (Commit: <sha>)` line.
- **Render** builds the backend: prod `srv-d3o0k1hr0fns73e18mbg` (main),
  dev `srv-d7bc0gh17lss73922p6g` (dev). API key is the `RENDER_API_KEY` line
  in the git-ignored repo-root `.env`. Poll
  `GET https://api.render.com/v1/services/{id}/deploys?limit=1` until `live`;
  logs at `/v1/services/{id}/logs`.
- After a backend deploy, smoke-test: `/health` → 200, an AI route without a
  token → 401.

## Backend Conventions

- **Every new endpoint must be authenticated.** Router-wide deps are set in
  `main.py` (`dependencies=[Depends(get_current_user)]`); only `/health` is
  public. `profile.py` attaches the dependency per-route.
- **Every OpenAI-backed route gets a slowapi limit**: decorate with
  `@limiter.limit(AI_HEAVY_LIMIT)` (10/min — long completions) or
  `AI_LIGHT_LIMIT` (30/min — short/scanning). The decorated function needs a
  `request: Request` param; name the body param `payload`.
- The auth dependency is intentionally sync (`def`, not `async def`) so the
  blocking `supabase.auth.get_user()` runs in FastAPI's threadpool.
- Don't create OpenAI/Supabase clients at import time — it crashes app import
  when env vars are missing (bit us in vision.py). Create per-request.
- Tests: `pytest` from `backend/` — `test_auth.py`, `test_profile.py`
  (mock-based; override `get_current_user` via `app.dependency_overrides`).
  Keep them green; add tests for new endpoints in the same style.
- Requirements are pinned in `backend/requirements.txt`; pin new deps too.

## Frontend Conventions

- **All backend calls go through `authFetch`** (`src/lib/apiClient.ts`) —
  never bare `fetch` to the API. It attaches the Supabase session token and
  is FormData-safe.
- **i18n is mandatory**: any user-visible string goes through the i18n system
  in all 6 languages (en/es/fr/de/zh/ja). No hardcoded UI text.
- UI: current live design is the **purple-blue gradient + system-ui font**.
  Match it. The "Bright Kitchen" redesign is DORMANT — only on explicit
  request.
- All UI changes must be mobile-friendly (small-viewport assumptions).
- `API_BASE` is `import.meta.env.VITE_API_URL || '/_/backend'`.
- Typecheck with `npx tsc --noEmit` — there is no linter or CI yet.

## Hard-Won Gotchas (verified; do not re-learn these)

- **Hunting frontend→backend call sites: grep `VITE_API_URL`, not just
  `API_BASE`.** An inline fetch (donation modal) was missed by an `API_BASE`
  grep and broke in production when auth shipped.
- **Checking FKs that reference `auth.users`: query `pg_constraint`, not
  `information_schema`** — the latter hides them (privilege filtering). This
  once caused a wrong "missing cascade" migration.
- `donation.py` is LIVE (App.tsx donation modal). `recipeService.ts`'s
  `fetchRecipes()` is dead (only its `Recipe` type is imported).
- Supabase logs: app errors are in the `error_logs` table; platform logs need
  `SUPABASE_ACCESS_TOKEN`. Never put tokens in URLs.
- Rate-limit state is in-memory per Render instance (fine at current scale).

## Local Environment (this machine)

- Non-interactive shells miss PATH entries. Prepend
  `C:\Program Files\nodejs;%APPDATA%\npm` for node/npm/npx/vercel.
  GitHub CLI: `C:\Program Files\GitHub CLI\gh.exe`. Supabase CLI:
  `%APPDATA%\npm\supabase.exe` (linked to the project ref above).
- Vercel CLI breaks under Git Bash — run it from PowerShell.
- No repo venv: create one in the session scratchpad,
  `pip install -r backend/requirements.txt` plus `pytest`.
- Set `PYTHONIOENCODING=utf-8` before running uvicorn locally (emoji prints
  crash the cp1252 console).
- Local `.env` has only `RENDER_API_KEY`; Supabase URL/keys live in
  Vercel/Render env vars. The anon key is public by design; fetch keys via
  `supabase projects api-keys --project-ref sgfhlerngtjkhrzztwhp`.
- For authenticated E2E against deployed backends: create a disposable
  Supabase user via the admin API (service-role key), password-grant sign-in
  for a token, delete the user afterwards.

## Living Documents

- `docs/audit-remediation-plan.md` — the security/quality backlog. **Read it
  before working any audit item**; keep its statuses current.
- `docs/audit-batch2-plan.md` — spec for the next batch (logging/monitoring,
  print XSS, dead code).

## Safety Reminders

- Ask before destructive git operations (`reset --hard`, `branch -D`,
  `push --force`).
- State the target branch before every `git push`; `main` requires the
  explicit release phrase (see Git Workflow).
- `supabase db push` and production DB writes need the user's explicit
  approval — name the specific action when asking.
- Never log or commit secrets; logs are retained by hosts. `.gitignore`
  covers `.env*` — keep it that way.
