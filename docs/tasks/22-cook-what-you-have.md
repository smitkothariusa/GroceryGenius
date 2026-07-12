# 22 — Cook What You Have (Pantry-First, Expiry-Aware Recipes)

**Priority:** 🟢 Feature (backlog: [feature-ideas.md #5](../feature-ideas.md#5-cook-what-you-have-recipe-mode-pantry-first-expiry-aware))
**Effort:** M
**Status:** IN PROGRESS

## Problem

Users track pantry expiry dates but nothing turns that into action — the
recipe generator already supports a strict "use ONLY these ingredients"
mode (`recipes.py`, `payload.strict`), and the frontend already has a
loose/strict toggle plus an "add all pantry to ingredients" action
(`RecipeSection.tsx`'s `addPantryToIngredients`). The missing piece is a
one-tap entry point that feeds *expiring-soon* items specifically, so
users cook down what's about to spoil instead of manually building the
ingredient list.

## Resolved product decisions (2026-07-12, user said "keep going" —
judgment calls made and recorded here per the skill's non-heavy-idea rule)

1. **No backend changes.** `recipes.py`'s `strict: bool` flag already does
   exactly the "use ONLY these ingredients" prompt shaping this idea needs
   (`recipes.py:64-70`). This is a pure frontend feature: a new ingredient-
   population path, not new AI infra.
2. **Expiry window: reuse the existing 3-day "expiring soon" definition**
   (`frontend/src/lib/pantryExpiry.ts`'s `isExpiringSoon`/`daysUntilExpiry`,
   already used by the Pantry and Donation tabs) rather than inventing a
   new threshold. Consistency across tabs beats a bespoke window, and it's
   already tested (`pantryExpiry.test.ts`).
3. **No hard cap on item count** — reuses the same unbounded pattern as
   the existing `addPantryToIngredients()`. If nothing is expiring within
   the window, show an empty/disabled state rather than silently falling
   back to the full pantry (falling back would defeat the "use it up"
   framing and surprise the user with an unrelated recipe set).
4. **Toggle on existing recipe generation, not a new tab.** Add a CTA
   button (e.g. "🍳 Cook what's expiring") near the existing "add pantry to
   ingredients" affordance in `RecipeSection.tsx`. Clicking it:
   - Populates `ingredientTags` with only the items where
     `isExpiringSoon(item)` is true (by name, same lowercasing convention
     as `addPantryToIngredients`).
   - Sets `recipeMode` to `'strict'` (via the existing
     `handleRecipeModeChange`, so the `localStorage` persistence stays
     consistent) — the point is forcing "use what you have," and the user
     can still flip back to loose afterward via the existing toggle if
     they want staples included.
   - Does NOT auto-submit the generation request — let the user review the
     populated ingredients/mode and hit the existing generate action
     themselves, consistent with how `addPantryToIngredients` already
     behaves (populate, don't auto-submit).
   - Disabled (or hidden) when no pantry items are currently expiring soon,
     with a short empty-state string explaining why.

## Implementation steps

1. `RecipeSection.tsx`: add a button near `addPantryToIngredients`'s UI
   location. New handler `addExpiringPantryToIngredients()`:
   ```ts
   const expiring = pantry.filter(item => isExpiringSoon(item));
   setIngredientTags(Array.from(new Set([...ingredientTags, ...expiring.map(i => i.name.toLowerCase())])));
   handleRecipeModeChange('strict');
   ```
   Import `isExpiringSoon` from `../../lib/pantryExpiry` (already exported,
   already tested — don't reimplement).
2. Disable/hide the button when `pantry.filter(isExpiringSoon).length === 0`;
   show `t('recipes.noExpiringItems')` (or similar) as a tooltip/empty
   state — new i18n key.
3. i18n: add the button label + empty-state string across all 6 locales
   (en/es/fr/de/zh/ja), following the existing `recipes.*` key convention.
4. No schema change, no new backend route, no `authFetch` changes — the
   existing generate call already accepts `strict` in its payload.

## Verification checklist

- `npx tsc --noEmit` passes.
- Manually exercise: pantry with at least one item expiring within 3 days
  and one item expiring later — confirm the CTA only pulls in the
  near-expiry item(s), and mode switches to strict.
- Confirm the CTA is disabled/hidden with an empty-state message when no
  items are expiring soon.
- Confirm existing `addPantryToIngredients` (add-all) and the loose/strict
  toggle still behave exactly as before — this is additive, not a
  replacement.
- Confirm all 6 locale files have the new keys.
- Mobile: button fits alongside the existing "add pantry" control without
  wrapping awkwardly at narrow widths.
