# 06 — Refactor App.tsx Into Feature Modules

**Priority:** 🟠 High
**Effort:** XL (multi-day, do incrementally)
**Status:** NOT STARTED

`frontend/src/App.tsx` is confirmed 7927 lines. Break it into feature
modules (e.g. `RecipeGenerator`, `PantryManager`, `ShoppingList`,
`MealPlanner`) under `frontend/src/features/`, extracting shared state via
context or a light state manager rather than prop-drilling. Do this
incrementally behind the existing error boundaries ([task 02](02-error-boundaries.md))
so a bad extraction fails loud in one section, not the whole app. Full spec
TBD when this task is picked up — needs a read-through of the current
monolith to map section boundaries before writing the extraction plan.
