# Recipe Generator — Mobile UI Fix

**Date:** 2026-04-04
**Scope:** Mobile layout only (`isMobile === true` path in `App.tsx`). Desktop layout unchanged.

---

## Problem

The recipe generator's control panel overflows horizontally on mobile:

1. **Header row** (`line ~2645`): title + "Add Pantry" button + strict/loose toggle + "Clear All" button all in a single `display:flex` row with no wrapping — overflows on 375px screens.
2. **Controls row** (`line ~2708`): dietary dropdown (`minWidth: 200px`), servings control, 4-button difficulty group, scan button, and generate button in one flex row — overflows and looks cluttered.

---

## Design: Single Compact Card

All controls live in one `rgba(255,255,255,0.95)` card on mobile. No separate section cards. Desktop layout (`!isMobile`) is not touched.

### Layout (top to bottom)

**Section 1 — Ingredients**

- Row: `🥘 What do you have?` label (flex:1) + `📦 Pantry` button + `✕ Clear` button
  - Three items only — fits on any mobile screen without overflow
- Ingredient tag chips (flex-wrap, green gradient badges)
- Full-width ingredient text input
- Full-width Strict / Loose toggle (replaces the cramped inline toggle)

**Divider** — `1px` `#f3f4f6` line separating ingredients from filters

**Section 2 — Filters**

- Label `Recipe Search` + full-width search input
- Label `Dietary preference` + full-width dietary `<select>`
- 2-column grid:
  - Left: label `Difficulty` + 4-button difficulty row (Flex / Easy / Med / Hard, abbreviated)
  - Right: label `Servings` + `−` / count / `+` stepper control

**Section 3 — Actions**

- Row: `📷 Scan` (purple) + `🍳 Get Recipes` (green gradient, flex:1)

---

## Implementation Notes

- Wrap only the `currentTab === 'recipes'` JSX section's inner control panel in an `isMobile` conditional.
- The ingredient tag area and inputs already use `boxSizing: 'border-box'` — keep that.
- Difficulty buttons: use abbreviated labels (`Flex`, `Easy`, `Med`, `Hard`) on mobile only.
- Servings: replace the current `<input type="number">` with a `−` / `+` stepper on mobile (same state, just different UI).
- Clear button: currently `margin-left: auto` in the flex row — move it beside the Pantry button in the simplified header row.
- No new components needed — all inline styles like the rest of App.tsx.

---

## Out of Scope

- Desktop layout changes
- RecipeCard / RecipeList mobile styling
- Any other tab (pantry, shopping, meal plan)
