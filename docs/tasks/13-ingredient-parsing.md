# 13 — Centralize Ingredient Parsing Logic

**Priority:** 🟠 High
**Effort:** M (1 day)
**Status:** NOT STARTED

Water/ice-skipping and other ingredient-normalization logic is duplicated
across routers (recipes, pantry, shopping, vision, barcode — confirm exact
duplication sites by grepping for the skip logic before starting). Extract
into a shared `backend/app/services/ingredient_parsing.py` utility and
replace each duplicated inline implementation with a call to it. Pure
refactor — no behavior change intended, so back it with tests that lock in
current behavior before extracting.
