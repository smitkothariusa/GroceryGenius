# Recipe Mode: Strict / Loose — Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Add a persistent per-user toggle that controls how the AI generates recipes:

- **Loose** (default): The AI uses the listed ingredients as a starting point and may add complementary ingredients (spices, oils, staples, etc.)
- **Strict**: The AI generates recipes using *only* the exact ingredients listed — no additions or substitutions

---

## UI

A labeled toggle row is added to the recipe controls section in the Recipes tab, positioned above the Generate button.

**Appearance:**
- Label: "Recipe mode:" — Bricolage Grotesque 600, `var(--gg-espresso)`
- Two pill options: `Loose` and `Strict`
- Active pill: `var(--gg-tomato)` background, white text, Bricolage Grotesque 600
- Inactive pill: `var(--gg-parchment)` background, `var(--gg-taupe)` text
- Container: `var(--gg-cream)` background, `var(--gg-border)` border, `var(--gg-radius-md)`

**Persistence:**
- Stored in `localStorage` under key `gg_recipe_mode`
- Values: `'loose'` or `'strict'`
- Default: `'loose'` if key is absent

---

## Frontend Changes (`frontend/src/App.tsx`)

1. Add state: `const [recipeMode, setRecipeMode] = useState<'loose' | 'strict'>(() => (localStorage.getItem('gg_recipe_mode') as 'loose' | 'strict') ?? 'loose')`
2. On toggle change: call `setRecipeMode(value)` and `localStorage.setItem('gg_recipe_mode', value)`
3. In `handleGetRecipes`, add `strict: recipeMode === 'strict'` to the POST body alongside `ingredients`
4. Render the toggle UI above the Generate button in the recipe controls section

---

## Backend Changes (`backend/app/routers/recipes.py`)

1. Update `Ingredients` Pydantic model to include `strict: bool = False`
2. Modify the user prompt construction:
   - **Loose** (current, `strict=False`): `"Using these ingredients: X, Y, Z"`
   - **Strict** (`strict=True`): `"Using ONLY these exact ingredients (no substitutions, additions, or extra pantry staples): X, Y, Z"`
3. No changes to response structure, parsing, or other endpoints

---

## Data Flow

```
User toggles mode → localStorage updated → recipeMode state updated
User clicks Generate → POST /recipes { ingredients: [...], strict: true/false }
Backend reads strict flag → adjusts prompt wording
AI responds with recipes using only listed ingredients (strict) or freely (loose)
```

---

## Out of Scope

- No server-side persistence of this preference (localStorage is sufficient)
- No per-recipe override — mode applies to the entire generation request
- No changes to the translate, translate-full, or other recipe endpoints
