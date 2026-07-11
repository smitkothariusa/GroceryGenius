# 11 — Offline Support (PWA)

**Priority:** 🟠 High
**Effort:** L (2-3 days)
**Status:** NOT STARTED

PWA is registered but has no offline strategy. Add a service worker caching
strategy (likely Workbox via Vite PWA plugin) for static assets and
last-known pantry/shopping data, plus a sync queue for writes made while
offline (pantry add/delete, shopping list edits) that replays against
Supabase once connectivity returns. Needs conflict-resolution thought once
[task 01](01-pantry-persistence.md) moves pantry/shopping to Supabase
directly — design this after that migration lands, not before, since the
sync target changes.
