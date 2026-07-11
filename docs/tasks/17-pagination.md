# 17 — Pagination for Pantry/Shopping Lists

**Priority:** 🟡 Medium
**Effort:** S (half day)
**Status:** NOT STARTED

Pantry/shopping list reads currently return all items unbounded. Low
urgency at current per-user item counts, but add `limit`/`offset` (or
cursor) support once [task 01](01-pantry-persistence.md) moves these to
Supabase — Supabase's `.range()` makes this close to free at that point, so
sequence this after task 01 rather than building it against the
soon-to-be-replaced in-memory store.
