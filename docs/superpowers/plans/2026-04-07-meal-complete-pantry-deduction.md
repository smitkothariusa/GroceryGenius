# Meal Complete → Pantry Deduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user marks a meal as complete (✓), open a checklist modal that AI-matches recipe ingredients to pantry items, lets the user confirm, and deducts used quantities from the pantry.

**Architecture:** New backend endpoint `POST /pantry/match-ingredients` uses GPT-4o-mini to parse ingredients and fuzzy-match them to pantry items. A new `DeductIngredientsModal` component handles the UI. `MealPlanCalendar` receives pantry data as a prop and fires the modal after toggling complete. App.tsx wires the pantry state through.

**Tech Stack:** FastAPI + GPT-4o-mini (backend), React + TypeScript (frontend), Supabase via `pantryService` in `database.ts`, i18next for all 6 locales.

---

## File Map

| File | Change |
|------|--------|
| `backend/app/routers/pantry.py` | Add `POST /pantry/match-ingredients` endpoint |
| `frontend/src/components/DeductIngredientsModal.tsx` | New modal component |
| `frontend/src/components/MealPlanCalendar.tsx` | Add `pantry`/`onPantryUpdate` props, modify `handleToggleComplete`, render modal |
| `frontend/src/App.tsx` | Pass `pantry` and `onPantryUpdate` to `MealPlanCalendar` |
| `frontend/src/locales/en/translation.json` | Add i18n keys |
| `frontend/src/locales/es/translation.json` | Add i18n keys |
| `frontend/src/locales/fr/translation.json` | Add i18n keys |
| `frontend/src/locales/de/translation.json` | Add i18n keys |
| `frontend/src/locales/ja/translation.json` | Add i18n keys |
| `frontend/src/locales/zh/translation.json` | Add i18n keys |

---

## Task 1: Backend — `POST /pantry/match-ingredients`

**Files:**
- Modify: `backend/app/routers/pantry.py`

- [ ] **Step 1: Add the endpoint to `backend/app/routers/pantry.py`**

Add these imports at the top (after existing imports):
```python
import json
from app.services.openai_client import call_chat_completion
```

Then add at the bottom of the file:

```python
class MatchIngredientsRequest(BaseModel):
    ingredient_lines: List[str]
    pantry_items: List[dict]  # [{id, name, quantity, unit}]

@router.post("/match-ingredients")
async def match_ingredients(payload: MatchIngredientsRequest):
    """AI-match recipe ingredient lines against pantry items."""
    lines = [l.strip() for l in payload.ingredient_lines if l.strip()]
    if not lines or not payload.pantry_items:
        # Still parse ingredients even with no pantry
        parsed = [{"ingredient_name": l, "quantity": 1, "unit": "pc",
                   "pantry_id": None, "pantry_name": None,
                   "pantry_quantity": None, "pantry_unit": None, "remainder": None}
                  for l in lines]
        return parsed

    pantry_text = "\n".join(
        f"- id:{item['id']} name:\"{item['name']}\" qty:{item['quantity']} unit:{item['unit']}"
        for item in payload.pantry_items
    )
    ingredients_text = "\n".join(f"- {l}" for l in lines)

    system_prompt = (
        "You are a pantry matcher. Parse recipe ingredients and match them to pantry items.\n"
        "Rules:\n"
        "1. Parse each ingredient line: extract name (strip descriptors/parentheticals), "
        "quantity (convert fractions: 1/4→0.25, 1/2→0.5, 1 1/2→1.5), unit.\n"
        "2. Skip water, ice, and non-grocery items — omit them entirely from output.\n"
        "3. Match each ingredient to the closest pantry item by name. "
        "Handle synonyms (scallions↔green onions, chicken breast↔chicken).\n"
        "4. Only match if units are compatible (same unit, OR both are count-based: "
        "pc/clove/slice/piece/whole count as compatible).\n"
        "5. If no match or incompatible units, set pantry_id to null.\n"
        "6. remainder = pantry_quantity - ingredient_quantity (null if no match).\n"
        "Return ONLY valid JSON array, no markdown:\n"
        '[{"ingredient_name":"...","quantity":0.0,"unit":"...",'
        '"pantry_id":"..." or null,"pantry_name":"..." or null,'
        '"pantry_quantity":0.0 or null,"pantry_unit":"..." or null,'
        '"remainder":0.0 or null}]'
    )
    user_prompt = f"Recipe ingredients:\n{ingredients_text}\n\nPantry items:\n{pantry_text}"

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=2000, temperature=0.1)
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"match-ingredients error: {e}")
        raise HTTPException(status_code=500, detail="Failed to match ingredients")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/pantry.py
git commit -m "feat: add POST /pantry/match-ingredients AI endpoint"
```

---

## Task 2: i18n Keys (all 6 locales)

**Files:** All 6 `frontend/src/locales/*/translation.json`

- [ ] **Step 1: Add keys to `frontend/src/locales/en/translation.json`**

Find the `"mealPlan"` section and add inside it (after `"generatingShoppingList"`):

```json
"deductModal": {
  "title": "Deduct Ingredients from Pantry",
  "loading": "Matching ingredients to your pantry...",
  "matchFound": "uses {{quantity}} {{unit}} · you have {{pantryQuantity}} {{pantryUnit}} → {{remainder}} remaining",
  "notInPantry": "Not in pantry",
  "depleted": "uses {{quantity}} {{unit}} · you have {{pantryQuantity}} {{pantryUnit}} → will be removed",
  "deductButton": "Deduct from Pantry",
  "skipButton": "Skip",
  "successToast": "Deducted {{count}} ingredient(s) from your pantry"
}
```

- [ ] **Step 2: Add keys to `frontend/src/locales/es/translation.json`**

```json
"deductModal": {
  "title": "Deducir Ingredientes del Despensero",
  "loading": "Comparando ingredientes con tu despensa...",
  "matchFound": "usa {{quantity}} {{unit}} · tienes {{pantryQuantity}} {{pantryUnit}} → quedan {{remainder}}",
  "notInPantry": "No está en la despensa",
  "depleted": "usa {{quantity}} {{unit}} · tienes {{pantryQuantity}} {{pantryUnit}} → se eliminará",
  "deductButton": "Deducir de la Despensa",
  "skipButton": "Omitir",
  "successToast": "Se dedujeron {{count}} ingrediente(s) de tu despensa"
}
```

- [ ] **Step 3: Add keys to `frontend/src/locales/fr/translation.json`**

```json
"deductModal": {
  "title": "Déduire les Ingrédients du Garde-manger",
  "loading": "Correspondance des ingrédients avec votre garde-manger...",
  "matchFound": "utilise {{quantity}} {{unit}} · vous avez {{pantryQuantity}} {{pantryUnit}} → il reste {{remainder}}",
  "notInPantry": "Pas dans le garde-manger",
  "depleted": "utilise {{quantity}} {{unit}} · vous avez {{pantryQuantity}} {{pantryUnit}} → sera supprimé",
  "deductButton": "Déduire du Garde-manger",
  "skipButton": "Passer",
  "successToast": "{{count}} ingrédient(s) déduit(s) de votre garde-manger"
}
```

- [ ] **Step 4: Add keys to `frontend/src/locales/de/translation.json`**

```json
"deductModal": {
  "title": "Zutaten aus der Speisekammer abziehen",
  "loading": "Zutaten werden mit der Speisekammer abgeglichen...",
  "matchFound": "benötigt {{quantity}} {{unit}} · vorhanden {{pantryQuantity}} {{pantryUnit}} → {{remainder}} verbleiben",
  "notInPantry": "Nicht in der Speisekammer",
  "depleted": "benötigt {{quantity}} {{unit}} · vorhanden {{pantryQuantity}} {{pantryUnit}} → wird entfernt",
  "deductButton": "Aus Speisekammer abziehen",
  "skipButton": "Überspringen",
  "successToast": "{{count}} Zutat(en) aus der Speisekammer abgezogen"
}
```

- [ ] **Step 5: Add keys to `frontend/src/locales/ja/translation.json`**

```json
"deductModal": {
  "title": "パントリーから食材を差し引く",
  "loading": "食材をパントリーと照合中...",
  "matchFound": "{{quantity}} {{unit}} 使用 · 在庫 {{pantryQuantity}} {{pantryUnit}} → 残り {{remainder}}",
  "notInPantry": "パントリーにありません",
  "depleted": "{{quantity}} {{unit}} 使用 · 在庫 {{pantryQuantity}} {{pantryUnit}} → 削除されます",
  "deductButton": "パントリーから差し引く",
  "skipButton": "スキップ",
  "successToast": "{{count}} 個の食材をパントリーから差し引きました"
}
```

- [ ] **Step 6: Add keys to `frontend/src/locales/zh/translation.json`**

```json
"deductModal": {
  "title": "从储藏室扣除食材",
  "loading": "正在将食材与储藏室匹配...",
  "matchFound": "使用 {{quantity}} {{unit}} · 库存 {{pantryQuantity}} {{pantryUnit}} → 剩余 {{remainder}}",
  "notInPantry": "储藏室中没有",
  "depleted": "使用 {{quantity}} {{unit}} · 库存 {{pantryQuantity}} {{pantryUnit}} → 将被移除",
  "deductButton": "从储藏室扣除",
  "skipButton": "跳过",
  "successToast": "已从储藏室扣除 {{count}} 种食材"
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/
git commit -m "feat: add deductModal i18n keys to all 6 locales"
```

---

## Task 3: `DeductIngredientsModal` Component

**Files:**
- Create: `frontend/src/components/DeductIngredientsModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MatchResult {
  ingredient_name: string;
  quantity: number;
  unit: string;
  pantry_id: string | null;
  pantry_name: string | null;
  pantry_quantity: number | null;
  pantry_unit: string | null;
  remainder: number | null;
}

interface DeductIngredientsModalProps {
  recipeName: string;
  matches: MatchResult[];
  loading: boolean;
  isMobile: boolean;
  onConfirm: (checkedPantryIds: string[]) => Promise<void>;
  onSkip: () => void;
}

const DeductIngredientsModal: React.FC<DeductIngredientsModalProps> = ({
  recipeName,
  matches,
  loading,
  isMobile,
  onConfirm,
  onSkip,
}) => {
  const { t } = useTranslation();

  const matchedItems = matches.filter(m => m.pantry_id !== null);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(matchedItems.map(m => m.pantry_id!))
  );
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(Array.from(checked));
    setConfirming(false);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center', zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : '16px',
    padding: '1.5rem',
    width: isMobile ? '100%' : '540px',
    maxHeight: isMobile ? '80vh' : '70vh',
    display: 'flex', flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
  };

  return (
    <div style={overlayStyle} onClick={onSkip}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          {t('mealPlan.deductModal.title')} — {recipeName}
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            ⏳ {t('mealPlan.deductModal.loading')}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {matches.map((m, idx) => {
                const isMatch = m.pantry_id !== null;
                const isDepleted = isMatch && m.remainder !== null && m.remainder <= 0;
                return (
                  <label key={idx} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '8px',
                    background: isMatch ? '#f0fdf4' : '#f9fafb',
                    opacity: isMatch ? 1 : 0.55,
                    cursor: isMatch ? 'pointer' : 'default',
                  }}>
                    <input
                      type="checkbox"
                      disabled={!isMatch}
                      checked={isMatch && checked.has(m.pantry_id!)}
                      onChange={() => isMatch && toggle(m.pantry_id!)}
                      style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                        {m.ingredient_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                        {isMatch
                          ? isDepleted
                            ? t('mealPlan.deductModal.depleted', {
                                quantity: m.quantity, unit: m.unit,
                                pantryQuantity: m.pantry_quantity, pantryUnit: m.pantry_unit,
                              })
                            : t('mealPlan.deductModal.matchFound', {
                                quantity: m.quantity, unit: m.unit,
                                pantryQuantity: m.pantry_quantity, pantryUnit: m.pantry_unit,
                                remainder: Math.round(m.remainder! * 100) / 100,
                              })
                          : t('mealPlan.deductModal.notInPantry')}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirm}
                disabled={confirming || checked.size === 0}
                style={{
                  flex: 1, padding: '0.75rem', fontWeight: '600', fontSize: '1rem',
                  background: checked.size === 0 ? '#d1fae5' : 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: checked.size === 0 || confirming ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? '⏳' : `✓ ${t('mealPlan.deductModal.deductButton')}`}
              </button>
              <button
                onClick={onSkip}
                style={{
                  padding: '0.75rem 1.25rem', fontWeight: '600', fontSize: '1rem',
                  background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                }}
              >
                {t('mealPlan.deductModal.skipButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeductIngredientsModal;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DeductIngredientsModal.tsx
git commit -m "feat: add DeductIngredientsModal component"
```

---

## Task 4: Wire Modal into `MealPlanCalendar`

**Files:**
- Modify: `frontend/src/components/MealPlanCalendar.tsx`

- [ ] **Step 1: Add imports at the top of the file**

After the existing `import { mealPlansService } from '../lib/database';` line, add:

```tsx
import { pantryService } from '../lib/database';
import DeductIngredientsModal, { MatchResult } from './DeductIngredientsModal';
```

- [ ] **Step 2: Add new props to `MealPlanCalendarProps`**

Find the existing interface:
```tsx
interface MealPlanCalendarProps {
  savedRecipes: Recipe[];
  translatedNames?: Record<string, string>;
  onAddToShoppingList?: (items: ParsedIngredient[]) => void;
}
```

Replace with:
```tsx
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
}

interface MealPlanCalendarProps {
  savedRecipes: Recipe[];
  translatedNames?: Record<string, string>;
  onAddToShoppingList?: (items: ParsedIngredient[]) => void;
  pantry?: PantryItem[];
  onPantryUpdate?: (updatedPantry: PantryItem[]) => void;
}
```

- [ ] **Step 3: Destructure new props in the component function**

Find the line:
```tsx
const MealPlanCalendar: React.FC<MealPlanCalendarProps> = ({ savedRecipes, translatedNames = {}, onAddToShoppingList }) => {
```

Replace with:
```tsx
const MealPlanCalendar: React.FC<MealPlanCalendarProps> = ({ savedRecipes, translatedNames = {}, onAddToShoppingList, pantry = [], onPantryUpdate }) => {
```

- [ ] **Step 4: Add modal state variables**

After the existing `const [generatingList, setGeneratingList] = useState(false);` line, add:

```tsx
const [deductModal, setDeductModal] = useState<{
  mealId: string;
  recipeName: string;
  matches: MatchResult[];
} | null>(null);
const [deductLoading, setDeductLoading] = useState(false);
```

- [ ] **Step 5: Replace `handleToggleComplete` with the new version that triggers the modal**

Find the existing `handleToggleComplete` function:
```tsx
const handleToggleComplete = async (mealId: string) => {
  const meal = mealPlans.find(m => m.id === mealId);
  if (meal) {
    try {
      await mealPlansService.update(mealId, { completed: !meal.completed });
      setMealPlans(mealPlans.map(m =>
        m.id === mealId ? { ...m, completed: !m.completed } : m
      ));
    } catch (error) {
      console.error('Error updating meal:', error);
    }
  }
};
```

Replace with:
```tsx
const handleToggleComplete = async (mealId: string) => {
  const meal = mealPlans.find(m => m.id === mealId);
  if (!meal) return;
  try {
    const nowComplete = !meal.completed;
    await mealPlansService.update(mealId, { completed: nowComplete });
    setMealPlans(mealPlans.map(m =>
      m.id === mealId ? { ...m, completed: nowComplete } : m
    ));

    // Only trigger deduction flow when marking complete (not uncomplete) and recipe exists
    if (nowComplete && meal.recipe?.ingredients) {
      const ingredientLines = meal.recipe.ingredients
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      setDeductModal({ mealId, recipeName: meal.recipe.name, matches: [] });
      setDeductLoading(true);

      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/pantry/match-ingredients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredient_lines: ingredientLines,
            pantry_items: pantry.map(p => ({
              id: p.id,
              name: p.name,
              quantity: p.quantity,
              unit: p.unit,
            })),
          }),
        });
        if (!response.ok) throw new Error('Match failed');
        const matches: MatchResult[] = await response.json();
        setDeductModal({ mealId, recipeName: meal.recipe.name, matches });
      } catch (err) {
        console.error('Failed to match ingredients:', err);
        setDeductModal(null);
      } finally {
        setDeductLoading(false);
      }
    }
  } catch (error) {
    console.error('Error updating meal:', error);
  }
};
```

- [ ] **Step 6: Add `handleDeductConfirm` and `handleDeductSkip` handlers**

Add these two functions right after `handleToggleComplete`:

```tsx
const handleDeductConfirm = async (checkedPantryIds: string[]) => {
  const updatedPantry = [...pantry];

  await Promise.all(
    checkedPantryIds.map(async pantryId => {
      const match = deductModal!.matches.find(m => m.pantry_id === pantryId);
      if (!match || match.remainder === null) return;

      if (match.remainder <= 0) {
        await pantryService.delete(pantryId);
        const idx = updatedPantry.findIndex(p => p.id === pantryId);
        if (idx !== -1) updatedPantry.splice(idx, 1);
      } else {
        await pantryService.update(pantryId, { quantity: match.remainder });
        const idx = updatedPantry.findIndex(p => p.id === pantryId);
        if (idx !== -1) updatedPantry[idx] = { ...updatedPantry[idx], quantity: match.remainder };
      }
    })
  );

  onPantryUpdate?.(updatedPantry);
  setDeductModal(null);
};

const handleDeductSkip = () => setDeductModal(null);
```

- [ ] **Step 7: Render the modal in the component's return JSX**

Find the final `return (` in the component. Add the modal just before the closing `</div>` at the very end of the return:

```tsx
{deductModal && (
  <DeductIngredientsModal
    recipeName={deductModal.recipeName}
    matches={deductModal.matches}
    loading={deductLoading}
    isMobile={isMobile}
    onConfirm={handleDeductConfirm}
    onSkip={handleDeductSkip}
  />
)}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/MealPlanCalendar.tsx
git commit -m "feat: trigger pantry deduction modal when meal marked complete"
```

---

## Task 5: Wire Props in `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Pass `pantry` and `onPantryUpdate` to `MealPlanCalendar`**

Find the existing `MealPlanCalendar` usage (around line 3187):
```tsx
<MealPlanCalendar
  savedRecipes={favorites}
  translatedNames={translatedFavoriteNames}
  onAddToShoppingList={async (items) => {
```

Add the two new props before `onAddToShoppingList`:
```tsx
<MealPlanCalendar
  savedRecipes={favorites}
  translatedNames={translatedFavoriteNames}
  pantry={pantry}
  onPantryUpdate={(updatedPantry) => setPantry(updatedPantry)}
  onAddToShoppingList={async (items) => {
```

- [ ] **Step 2: Commit and push**

```bash
git add frontend/src/App.tsx
git commit -m "feat: pass pantry state to MealPlanCalendar for deduction flow"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ ✓ button triggers modal (Task 4 Step 5)
- ✅ AI matches ingredients to pantry (Task 1)
- ✅ Pre-checked for matches, unchecked/greyed for non-matches (Task 3)
- ✅ Shows uses X / have Y → Z remaining (Task 3, matchFound key)
- ✅ Deduct button calls pantryService.update or .delete (Task 4 Step 6)
- ✅ Cancel/skip closes modal without changes (Task 3 onSkip, Task 4 handleDeductSkip)
- ✅ Partial deduction (5lb rice - 0.5lb = 4.5lb remaining) via `remainder` field
- ✅ Delete when remainder ≤ 0 (Task 4 Step 6)
- ✅ i18n all 6 locales (Task 2)
- ✅ Mobile bottom-sheet style (Task 3 overlayStyle)
- ✅ Only fires when marking complete, not uncomplete (Task 4 Step 5: `if (nowComplete && ...)`)

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:**
- `MatchResult` defined in `DeductIngredientsModal.tsx`, imported in `MealPlanCalendar.tsx` ✅
- `PantryItem` interface added to `MealPlanCalendar.tsx` matches the shape from `App.tsx` ✅
- `pantryService.update(id, { quantity })` and `pantryService.delete(id)` match existing signatures in `database.ts` ✅
- `onPantryUpdate` receives `PantryItem[]` and calls `setPantry` in App.tsx ✅
