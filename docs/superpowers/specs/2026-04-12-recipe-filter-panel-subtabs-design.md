# Recipe Filter Panel + Sub-tabs Design

**Date:** 2026-04-12
**Status:** Approved

---

## Problem

The recipe generator's filters (dietary preference, serving size, difficulty, and strict/loose mode) are scattered inline across the toolbar in different colors and styles. On desktop they form an unruly horizontal row; on mobile they stack vertically in the main panel. The strict/loose toggle lives in a different location from the other filters. There is no visual separation between ingredient-based recipe generation and searching by recipe name — both share the same input area.

---

## Solution Overview

1. **Consolidate all four filters behind a single "⚙️ Filters" button.** Active filters surface as dismissible chips below the toolbar. The panel itself is a clean 2×2 grid on desktop (inline slide-down) and a bottom sheet on mobile.
2. **Add sub-tabs inside the recipe card** — "By Ingredient" (existing flow) and "By Name" (new search-by-name flow) — as a pill toggle at the top.
3. **Unify color usage** to match the GroceryGenius palette throughout.

---

## Sub-tabs

A pill-style toggle renders at the top of the recipe card content area, above the ingredient input.

| Sub-tab | Label | Emoji |
|---------|-------|-------|
| By Ingredient | `recipes.subTabIngredient` | 🥘 |
| By Name | `recipes.subTabName` | 🔍 |

**By Ingredient** — existing flow unchanged: ingredient tag input, pantry button, scan button, Filters button, Get Recipes button.

**By Name** — new flow: a single text input for the recipe name/style, the same Filters button (dietary, servings, difficulty still apply), and a "Search Recipes" button. The recipe name search maps to the existing `recipeSearchQuery` state variable and `handleGetRecipes` handler. No ingredient tags are shown on this sub-tab.

**API behavior:** When `recipeSubTab === 'name'`, `handleGetRecipes` sends an empty ingredients array and passes only `recipeSearchQuery` (plus active filters). Ingredient tags and pantry ingredients are not included. When `recipeSubTab === 'ingredient'`, the existing behavior is unchanged. Switching sub-tabs preserves ingredient tag state so it is not lost.

**Filter state is shared** between both sub-tabs. Switching sub-tabs does not reset dietary preference, servings, difficulty, or strict/loose mode.

State variable: `const [recipeSubTab, setRecipeSubTab] = useState<'ingredient' | 'name'>('ingredient')`

---

## Filters Panel

### Trigger

A single **"⚙️ Filters"** button styled with `background: #8b5cf6` (purple — same as Scan and Pantry buttons). When any filter is non-default, a count badge appears on the button (e.g. `Filters 2`).

Non-default = dietary is not `''`, difficulty is not `'flexible'`, servings is not `2`, or mode is not `'loose'`.

### Active Chips

When any filter is non-default, chips render below the toolbar row (above the ingredient input area). Each chip shows the current value and an `×` to dismiss (reset that filter to default). A "Clear filters" link appears at the end of the chip row when any chip is present.

Chip style: `background: #ede9fe`, `color: #6d28d9`, pill shape.

### Desktop: Inline Slide-Down Panel

- Toggled open/closed by the Filters button.
- Renders directly below the toolbar row, above the ingredient/name input area.
- Layout: 2×2 grid (`grid-template-columns: 1fr 1fr`).
- Closes when: Filters button clicked again, or user clicks outside the panel.
- State variable: `const [showFilters, setShowFilters] = useState(false)`

### Mobile: Bottom Sheet

- Same trigger (Filters button).
- Opens a bottom sheet overlaying the page with a semi-transparent dim backdrop (`rgba(0,0,0,0.4)`).
- Sheet has: drag handle bar, "Filters" title, "Reset all" link, ✕ close button.
- Content: same four filters stacked vertically (dietary full-width, difficulty + servings in a 2-col grid, extra ingredients full-width).
- Closes on: ✕ button, "Reset all" (resets all to defaults and closes), backdrop tap.

---

## Filter Controls

All four filter controls use the same design language. Active/selected state: **`linear-gradient(45deg, #10b981, #059669)`** (green) — matching tabs and Get Recipes button. No per-option colors.

### Dietary Preference
`<select>` dropdown, full width. Options: All diets (default), Vegetarian, Vegan, Gluten-Free, Keto, Diabetic-Friendly, Heart-Healthy, plus any custom dietary labels from user profile.

### Servings
`−` / number / `+` stepper. Min 1, max 12. Default: 2.

### Difficulty
Four-option segmented control: Any (default) / Easy / Medium / Hard. Active segment uses green gradient, inactive segments are transparent with `#6b7280` text.

### Extra Ingredients (formerly Strict/Loose mode)
Two-option segmented control: Loose (default) / Strict. Renamed label for clarity. Same green active style. The strict/loose toggle is **removed from the header row** and only appears in the filter panel.

---

## i18n

All new strings must have keys in all 6 locale files (en, es, fr, de, zh, ja):

| Key | English value |
|-----|--------------|
| `recipes.subTabIngredient` | `By Ingredient` |
| `recipes.subTabName` | `By Name` |
| `recipes.filtersButton` | `Filters` |
| `recipes.clearFilters` | `Clear filters` |
| `recipes.resetAll` | `Reset all` |
| `recipes.extraIngredients` | `Extra Ingredients` |
| `recipes.searchByNamePlaceholder` | `e.g. pasta primavera…` |
| `recipes.searchByNameLabel` | `Recipe Name` |
| `recipes.searchRecipes` | `Search Recipes` |

Existing keys to reuse: `recipes.dietaryPreferences`, `recipes.servings`, `recipes.difficulty`, `recipes.difficultyLevelShort.*`, `recipes.dietary.*`, `recipes.modeStrict`, `recipes.modeLoose`.

---

## Component Structure

All changes stay within `frontend/src/App.tsx` — no new component files. The recipe tab section is large but self-contained. Two new local state variables are added (`recipeSubTab`, `showFilters`). The filter panel JSX is extracted into a `renderFilterPanel()` inline function within the component to avoid duplicating the desktop/mobile panel markup.

---

## Accessibility

- Filters button: `aria-expanded={showFilters}` and `aria-controls="recipe-filter-panel"`
- Filter panel: `id="recipe-filter-panel"`, `role="region"`, `aria-label={t('recipes.filtersButton')}`
- Mobile bottom sheet: `role="dialog"`, `aria-modal="true"`, `aria-label={t('recipes.filtersButton')}`
- Segmented controls: each button gets `aria-pressed={active}`
- Sub-tab toggle: each button gets `role="tab"`, `aria-selected={active}`

---

## What Does NOT Change

- The ingredient tag input behavior (type + Enter to add)
- The "Use Pantry Items" button
- The "Scan Ingredients" button
- The Get Recipes / Search Recipes handler (`handleGetRecipes`)
- Recipe results display
- Strict/loose localStorage persistence (key: `gg_recipe_mode`)
- The strict/loose mode state variable (`recipeMode`) — it just moves into the filter panel UI
