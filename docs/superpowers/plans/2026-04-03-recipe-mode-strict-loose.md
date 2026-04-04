# Recipe Mode: Strict / Loose — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Loose/Strict toggle that controls whether AI-generated recipes are allowed to use ingredients beyond what the user listed.

**Architecture:** The toggle state lives in React state, initialized from and synced to `localStorage`. The selected mode is sent as a `strict` boolean in the POST body to `/recipes`. The backend adjusts the AI prompt wording based on that flag — no other endpoint or parsing logic changes.

**Tech Stack:** React (TypeScript), FastAPI (Python/Pydantic), OpenAI via existing `call_chat_completion`

---

### Task 1: Backend — accept and apply the `strict` flag

**Files:**
- Modify: `backend/app/routers/recipes.py`

- [ ] **Step 1: Update the `Ingredients` Pydantic model**

In `backend/app/routers/recipes.py`, change the model from:

```python
class Ingredients(BaseModel):
    ingredients: List[str]
```

to:

```python
class Ingredients(BaseModel):
    ingredients: List[str]
    strict: bool = False
```

- [ ] **Step 2: Update the user prompt construction to respect `strict`**

In `generate_recipes`, find this block (around line 57):

```python
    else:
        recipe_request = f"Using these ingredients: {', '.join(ingredient_list)}"
```

Replace it with:

```python
    else:
        if payload.strict:
            recipe_request = f"Using ONLY these exact ingredients (no substitutions, additions, or extra pantry staples): {', '.join(ingredient_list)}"
        else:
            recipe_request = f"Using these ingredients: {', '.join(ingredient_list)}"
```

Also update the specific-recipe branch (around line 52–55) to reinforce strict mode when set:

```python
    if specific_recipe:
        recipe_request = f"Create a recipe for: {specific_recipe}"
        if ingredient_list:
            if payload.strict:
                recipe_request += f"\nUse ONLY these exact ingredients (no substitutions or additions): {', '.join(ingredient_list)}"
            else:
                recipe_request += f"\nIncorporate these ingredients when possible: {', '.join(ingredient_list)}"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/recipes.py
git commit -m "feat: accept strict flag in /recipes and adjust AI prompt"
```

---

### Task 2: Frontend — add `recipeMode` state with localStorage persistence

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add `recipeMode` state near other recipe-related state**

Search for `recipeLoading` state declaration in `App.tsx` (around line 122 area). Add the following nearby:

```typescript
const [recipeMode, setRecipeMode] = useState<'loose' | 'strict'>(
  () => (localStorage.getItem('gg_recipe_mode') as 'loose' | 'strict') ?? 'loose'
);
```

- [ ] **Step 2: Add a helper to update mode and persist it**

Add this function near `addPantryToIngredients` (around line 849):

```typescript
const handleRecipeModeChange = (mode: 'loose' | 'strict') => {
  setRecipeMode(mode);
  localStorage.setItem('gg_recipe_mode', mode);
};
```

- [ ] **Step 3: Pass `strict` in the fetch body inside `handleGetRecipes`**

In `handleGetRecipes` (around line 800–804), find:

```typescript
      body: JSON.stringify({ ingredients: allIngredients }),
```

Replace with:

```typescript
      body: JSON.stringify({ ingredients: allIngredients, strict: recipeMode === 'strict' }),
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add recipeMode state with localStorage persistence and pass strict to API"
```

---

### Task 3: Frontend — render the toggle UI above the Generate button

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Insert the toggle row above the Generate button**

In `App.tsx`, find the Generate button (around line 2708):

```tsx
                <button onClick={handleGetRecipes} disabled={recipeLoading}
```

Insert the following block **immediately before** that button:

```tsx
                {/* Recipe mode toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--gg-cream)', border: '1px solid var(--gg-border)',
                  borderRadius: 'var(--gg-radius-md)', padding: '0.4rem 0.75rem'
                }}>
                  <span style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 600, fontSize: '0.85rem', color: 'var(--gg-espresso)'
                  }}>Recipe mode:</span>
                  {(['loose', 'strict'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleRecipeModeChange(mode)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        background: recipeMode === mode ? 'var(--gg-tomato)' : 'var(--gg-parchment)',
                        color: recipeMode === mode ? 'white' : 'var(--gg-taupe)',
                        border: 'none', borderRadius: 'var(--gg-radius-md)', cursor: 'pointer',
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontWeight: 600, fontSize: '0.85rem',
                        textTransform: 'capitalize', transition: 'background 0.15s, color 0.15s'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: render strict/loose recipe mode toggle above Generate button"
```

---

### Task 4: Push

- [ ] **Step 1: Push all commits**

```bash
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Persistent toggle (localStorage `gg_recipe_mode`) — Task 2
- ✅ Loose/Strict pill UI above Generate button, on-brand styling — Task 3
- ✅ `strict` passed in POST body — Task 2, Step 3
- ✅ Backend prompt adjusted for strict vs loose — Task 1
- ✅ Default is `'loose'` — Task 2, Step 1
- ✅ No changes to translate/translate-full endpoints — correct, not touched

**Placeholder scan:** No TBDs, TODOs, or vague steps.

**Type consistency:** `recipeMode` typed as `'loose' | 'strict'` throughout; `strict: bool = False` in Pydantic; `strict: recipeMode === 'strict'` produces a boolean — consistent.
