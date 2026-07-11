# 01 — Pantry & Shopping Persistence + Per-User Isolation

**Priority:** 🔴 Critical
**Effort:** L (2-3 days)
**Status:** NOT STARTED

## Problem

`backend/app/routers/pantry.py` and `backend/app/routers/shopping.py` both
use a single module-level list as storage:

```python
# pantry.py:31
pantry_storage = []

# shopping.py — same pattern for shopping_storage
```

Two distinct bugs follow from this:

1. **Data loss on restart** — everything vanishes on every Render deploy or
   instance restart.
2. **Cross-user data leak (the real severity here)** — `get_pantry()`,
   `add_pantry_item()`, `delete_pantry_item()` and the shopping equivalents
   take no `user_id` and never filter by one. Every authenticated user reads
   and writes the *same* global list. Confirmed by grep: neither file
   references `user_id` or `current_user` anywhere. Any logged-in user can
   see, edit, or delete any other user's pantry/shopping items.

Routers are already behind `dependencies=auth_required` in `main.py`, so
`get_current_user` is available to inject — it's just not being used inside
the route bodies.

## Why Supabase, not backend DB

Per CLAUDE.md, the DB is Supabase Postgres and the frontend already talks to
it directly (`lib/supabase.ts`, `lib/database.ts`) with RLS for other
tables (recipes, profile). Pantry/shopping should follow the same pattern
rather than introducing a second persistence path through the backend.

## Implementation

1. **Schema** (new Supabase migration):
   ```sql
   create table public.pantry_items (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     name text not null,
     quantity integer not null default 0,
     unit text not null,
     category text not null default 'other',
     expiry_date timestamptz,
     added_date timestamptz not null default now()
   );
   alter table public.pantry_items enable row level security;
   create policy "pantry_items_owner" on public.pantry_items
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
   Mirror for `shopping_items` (add a `checked boolean default false` column
   to match current `ShoppingItem` fields — check
   `frontend/src/lib/database.ts` and the Pydantic models in `shopping.py`
   for the exact field set before writing the migration).

2. **Verify FKs the CLAUDE.md way**: after creating, confirm the
   `auth.users` FK actually exists via `pg_constraint`, not
   `information_schema` (the latter hides it — documented gotcha that
   already caused one wrong migration).

3. **Frontend**: add `getPantryItems`/`addPantryItem`/`deletePantryItem` (and
   shopping equivalents) to `lib/database.ts` following the existing pattern
   used for recipes/profile. Replace whatever currently calls the backend
   pantry/shopping CRUD endpoints in `App.tsx` (grep `VITE_API_URL` and
   `authFetch.*pantry`, `authFetch.*shopping` — don't rely on an `API_BASE`
   grep alone, per the documented gotcha) to call Supabase directly instead.

4. **Backend**: once the frontend owns CRUD via Supabase, decide per-route:
   - `GET/POST/DELETE /pantry/`, `/shopping/` (pure CRUD) → remove from the
     backend entirely (dead code once frontend migrates), OR
   - keep them but scope by `current_user` and proxy to Supabase using the
     user's token, if the user wants a single migration step before
     deleting the backend routes. **Default to deleting them** — matches
     the "backend is mostly stateless AI endpoints" architecture already
     documented in CLAUDE.md.
   - `POST /pantry/match-ingredients` and `POST /shopping/ai-price-comparison`
     stay — they're AI endpoints, not storage, and should keep accepting
     pantry/shopping items as request payload from the frontend rather than
     reading from the removed in-memory store.

5. **Migrate any existing data**: check whether `pantry_storage`/
   `shopping_storage` have real user data worth preserving (unlikely given
   it's wiped on every restart) — if not, skip a data migration step
   entirely.

## Verification

- [ ] Two different Supabase test users each add pantry items; confirm
      user A never sees user B's items (this is the regression test for the
      leak — write it as an automated test, not just manual click-through)
- [ ] Restart the backend process; pantry/shopping data for a user persists
- [ ] `pg_constraint` query confirms FK to `auth.users` with cascade delete
- [ ] RLS policy blocks a request using a different user's JWT (test via
      REST call with mismatched token, expect empty result / 403)
- [ ] `match-ingredients` and `ai-price-comparison` AI routes still work end
      to end with the new payload shape
