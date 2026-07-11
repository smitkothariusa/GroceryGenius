# 08 — Recipe Caching (Redis, 24h TTL)

**Priority:** 🟠 High
**Effort:** M (1 day)
**Status:** NOT STARTED

`recipes.py` hits OpenAI (gpt-4o-mini) on every request even for
identical/near-identical ingredient sets. Add a Redis cache keyed on a
normalized hash of the request payload (ingredients + preferences +
language), 24h TTL, to cut repeat OpenAI cost. Can share the Redis instance
added in [task 07](07-redis-rate-limiting.md) if that lands first — check
before provisioning a second one. Needs cache invalidation thought for any
user-specific personalization in the prompt (don't cache across users if
the prompt includes user-specific data that changes the "correct" answer).
