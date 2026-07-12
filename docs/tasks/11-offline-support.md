# 11 — Offline Support (PWA)

**Priority:** 🟠 High
**Effort:** L (2-3 days)
**Status:** NOT STARTED — scoped 2026-07-12, ready to implement

## What already exists (verified 2026-07-12, don't rebuild)

`vite.config.ts`'s `VitePWA` plugin already generates a real Workbox
service worker (`sw.js`), registered via `virtual:pwa-register` in
`main.tsx`. It already does:
- Static asset caching (`globPatterns: ['**/*.{js,css,html,ico,png,svg}']`)
- `NetworkFirst` runtime caching for `*.supabase.co` GET requests, 24h
  expiration

This is separate from `frontend/public/service-worker.js`, which is a
one-time kill-switch for an *old*, hand-rolled cache-first-forever worker
that broke mobile Safari sign-in (see CLAUDE.md gotchas) — that file's job
is done once every client has picked up the kill switch; don't touch it,
and don't add new logic to it.

Workbox's `NetworkFirst` strategy only caches GET requests by default —
mutations (POST/PATCH/DELETE against Supabase, i.e. every pantry/shopping
write) already just throw a network error when offline today. That's the
actual gap, and it's an app-layer problem, not a service-worker one.

## Scope (decided with user 2026-07-12)

- **Only pantry and shopping list** writes get queued offline — not
  recipes/favorites/donation (those need network anyway for AI generation
  or live inventory, offline value is low).
- **Conflict resolution: last-write-wins.** No version/timestamp checking
  against the server — a queued mutation just applies on top of whatever's
  there when it syncs. Pantry/shopping lists are single-user, not shared,
  so this is fine; don't build reject-on-conflict logic.
- **UI:** a small persistent banner ("You're offline — changes will sync
  later") shown while `navigator.onLine` is false / a mutation fails with
  a network error, plus a brief success toast when the queue flushes.

## Implementation approach

**Boundary: do this entirely at the app layer. Do not touch
`vite.config.ts`'s Workbox config, `frontend/public/service-worker.js`, or
`main.tsx`'s `registerSW()` call** — those are working and have already
caused one production incident when changed carelessly (see CLAUDE.md
gotchas: the SW reload-loop that broke mobile sign-in). This task doesn't
need service-worker changes to solve the actual gap.

1. A small offline-mutation-queue module (e.g.
   `frontend/src/lib/offlineQueue.ts`) backed by `localStorage` or
   IndexedDB: `{ id, entity: 'pantry' | 'shopping', operation: 'add' |
   'update' | 'delete', payload, timestamp }`.
2. Wrap the existing `pantryService`/`shoppingService` methods in
   `lib/database.ts` (or wrap their call sites) so that when a mutation's
   Supabase call fails due to a network error (not an auth/validation
   error — only queue genuine offline failures), the operation is
   optimistically applied to local UI state and pushed onto the queue
   instead of surfacing an error toast.
3. A drain function that replays the queue in order against Supabase,
   triggered on the browser's `online` event and once on app mount if the
   queue is non-empty. Clear each entry only after its Supabase call
   succeeds; stop and preserve remaining entries if one fails (don't lose
   data, don't reorder).
4. An offline-status banner component + hook (`navigator.onLine` +
   `online`/`offline` listeners), mounted once near the app root, and a
   toast on successful queue flush (reuse the existing toast hook, don't
   build a new one).
5. i18n: banner and toast text goes through the existing i18n system, all
   6 languages, per CLAUDE.md ("i18n is mandatory, no hardcoded UI text").
6. Mobile-friendly styling, matching the existing purple-blue
   gradient/system-ui design — this is a new visible UI element so check
   it doesn't collide with the existing top bar/toast stack.

## Verification

- `npx tsc --noEmit` and `npm run lint` clean.
- `npm test` green, no regressions in existing pantry/shopping tests.
- Manual (documented as needing it, can't fully test from a non-browser
  environment): toggle devtools "offline" mode, add/edit/delete a pantry
  item and a shopping item, confirm they appear queued + optimistically
  reflected in UI, go back online, confirm they sync and the banner/toast
  behave correctly. Also confirm normal online usage is completely
  unaffected (queue should be a no-op when online).
- **This is a new user-facing feature** — per CLAUDE.md Git Workflow #1,
  it waits for the user to try it on dev before any `main` release
  consideration, regardless of confidence level.
