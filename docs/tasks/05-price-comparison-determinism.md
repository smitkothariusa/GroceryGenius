# 05 — Fix Price Comparison Non-Determinism

**Priority:** 🔴 Critical
**Effort:** S (few hours)
**Status:** NOT STARTED

## Problem

`backend/app/routers/shopping.py:153` — the `ai-price-comparison` endpoint
calls `call_chat_completion(..., temperature=0.8)`. Confirmed by grep.
Every other price/structured-data-generating call in the codebase uses
0.1–0.3 (`barcode.py` uses 0.1 and 0, `pantry.py` uses 0.1,
`recipes.py`'s parsing calls use 0.3). 0.8 is high-variance sampling
appropriate for creative text, not for a feature where the same basket of
items should return roughly the same price estimate on repeated calls.

## Implementation

1. Change `shopping.py:153` from `temperature=0.8` to `temperature=0.3`
   (matching the convention used elsewhere for structured/factual output —
   `recipes.py`'s ingredient-parsing calls use exactly this value).
2. Read the surrounding system/user prompt in `shopping.py` around line 153
   — if the prompt itself encourages varied/creative pricing language,
   tighten it to ask for consistent, structured estimates so the fix isn't
   undone by prompt wording.
3. Check whether [task 08 (recipe caching)](08-recipe-caching.md)'s Redis
   cache should also apply here once built — a stable temperature plus a
   short TTL cache would make repeated identical requests both consistent
   and cheaper. Not required for this task, just worth flagging as a
   follow-on.

## Verification

- [ ] Call `ai-price-comparison` with the same payload 5 times, confirm
      price estimates are stable within a tight tolerance (not necessarily
      byte-identical — OpenAI isn't fully deterministic even at low temp —
      but no more wild swings)
- [ ] Existing shopping tests (added in [task 03](03-backend-tests.md) if
      not already present) pass
- [ ] Manually verify the feature still returns sensible, non-degenerate
      output — 0.3 shouldn't make responses robotic/repetitive to the point
      of being useless
