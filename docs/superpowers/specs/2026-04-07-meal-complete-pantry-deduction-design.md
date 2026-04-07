# Design: Meal Complete → Pantry Deduction

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

When a user marks a meal as complete (✓ button in MealPlanCalendar), the app opens a checklist modal that shows which recipe ingredients can be deducted from the pantry. The user confirms, and matching pantry quantities are reduced.

---

## User Flow

1. User clicks ✓ on a meal card in the meal plan calendar
2. Meal is marked `completed: true` (existing behavior, unchanged)
3. A "Deduct Ingredients" modal opens immediately with a loading state
4. Backend call: AI parses recipe ingredients AND matches them against current pantry items
5. Modal populates a checklist:
   - **Pantry match found (pre-checked):** `☑ Rice — uses 0.5 lb, you have 5 lb → 4.5 lb remaining`
   - **No match (unchecked, greyed):** `☐ Saffron — not in pantry`
6. User adjusts checkboxes → clicks **Deduct from Pantry**
7. For each checked item:
   - If `pantry.quantity - recipe.quantity > 0` → update pantry quantity to the remainder
   - If `pantry.quantity - recipe.quantity <= 0` → delete the pantry row entirely
8. Toast confirms: "Deducted 3 ingredients from your pantry"
9. Cancel/✗ closes modal without changes (meal stays complete)

---

## Backend

### New endpoint: `POST /pantry/match-ingredients`

**Request:**
```json
{
  "ingredient_lines": ["1/2 lb rice", "2 cloves garlic", "1 tsp saffron"],
  "pantry_items": [
    { "id": "uuid", "name": "rice", "quantity": 5, "unit": "lb" },
    { "id": "uuid", "name": "garlic cloves", "quantity": 10, "unit": "pc" }
  ]
}
```

**AI prompt:** Send the parsed ingredient list and pantry list to GPT-4o-mini. Ask it to:
- Parse each ingredient line into `{name, quantity, unit}` (reusing the parse-ingredients logic)
- Match each parsed ingredient to the closest pantry item by name (handles synonyms like "scallions" ↔ "green onions", "chicken breast" ↔ "chicken")
- Only match if units are compatible (same unit, or one is `pc` and can be reconciled)
- Return unmatched ingredients with `pantry_id: null`

**Response:**
```json
[
  {
    "ingredient_name": "rice",
    "quantity": 0.5,
    "unit": "lb",
    "pantry_id": "uuid",
    "pantry_name": "rice",
    "pantry_quantity": 5,
    "pantry_unit": "lb",
    "remainder": 4.5
  },
  {
    "ingredient_name": "saffron",
    "quantity": 1,
    "unit": "tsp",
    "pantry_id": null,
    "pantry_name": null,
    "pantry_quantity": null,
    "pantry_unit": null,
    "remainder": null
  }
]
```

**Location:** `backend/app/routers/pantry.py`

---

## Frontend

### MealPlanCalendar.tsx

- Add state: `deductModal: { mealId: string; recipeName: string; matches: MatchResult[] } | null`
- Add state: `deductLoading: boolean`
- Modify the existing ✓ toggle handler: after toggling `completed`, if meal is now `completed: true` and has a recipe, fire the modal flow
- If toggling back to incomplete, skip the modal entirely

### DeductIngredientsModal (inline in MealPlanCalendar or small extracted component)

- Full-screen bottom sheet on mobile, centered modal on desktop
- Loading skeleton while `/pantry/match-ingredients` call is in flight
- Checklist rows: matched items pre-checked, unmatched unchecked + greyed
- Each matched row shows: ingredient name, quantity used, pantry quantity, remainder
- "Deduct from Pantry" button (green) + "Skip" button (grey)
- On confirm: call `pantryService.update(id, { quantity: remainder })` or `pantryService.delete(id)` for each checked match; then show toast

### i18n keys to add (all 6 locales: en, es, fr, de, ja, zh)

```
mealPlan.deductModal.title
mealPlan.deductModal.loading
mealPlan.deductModal.matchFound       (e.g. "uses {{quantity}} {{unit}}, you have {{pantryQuantity}} {{pantryUnit}} → {{remainder}} remaining")
mealPlan.deductModal.notInPantry
mealPlan.deductModal.deductButton
mealPlan.deductModal.skipButton
mealPlan.deductModal.successToast     (e.g. "Deducted {{count}} ingredients from your pantry")
```

---

## Pantry Update Logic

```
for each checked match:
  remainder = pantry.quantity - ingredient.quantity
  if remainder <= 0:
    pantryService.delete(pantry_id)
  else:
    pantryService.update(pantry_id, { quantity: remainder })
```

---

## What Is NOT in Scope

- Unit conversion (tbsp ↔ tsp, g ↔ oz) — AI matches only compatible units
- Editing quantities in the modal — users check/uncheck only
- Retroactive deduction for already-completed meals
- Any changes to the pantry tab UI
