# 16 — Health Check Endpoint Dependency Checks

**Priority:** 🟡 Medium
**Effort:** S (half day)
**Status:** NOT STARTED

`/health` (the one public, unauthenticated route per CLAUDE.md) currently
only checks app-is-up status. Extend it to check downstream dependencies —
Supabase reachability, OpenAI API reachability (lightweight check, not a
real completion call), and Redis once [task 07](07-redis-rate-limiting.md)
/[08](08-recipe-caching.md) add it. Keep it fast and side-effect-free;
this gets polled by uptime monitors. Update the post-deploy smoke test
described in CLAUDE.md if the response shape changes.
