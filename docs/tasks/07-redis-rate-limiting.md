# 07 — Redis-Backed Rate Limiting for Multi-Instance

**Priority:** 🟠 High
**Effort:** M (1 day)
**Status:** NOT STARTED

`backend/app/services/auth.py:59` — `Limiter(key_func=rate_limit_key)` has
no `storage_uri`, so slowapi defaults to in-memory, per-process state. Per
CLAUDE.md this is explicitly noted as "fine at current scale" on a single
Render instance, which is why this is High rather than Critical. Becomes a
real gap the moment Render is scaled to multiple instances (limits get
divided across instances instead of enforced globally). Add a Redis
instance and pass `storage_uri="redis://..."` to the `Limiter` constructor;
update `AI_HEAVY_LIMIT`/`AI_LIGHT_LIMIT` usage sites to confirm compatibility.
