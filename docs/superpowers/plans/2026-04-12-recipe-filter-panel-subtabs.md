# Recipe Filter Panel + Sub-tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate recipe filters behind a single Filters button (desktop: floating popover; mobile: bottom sheet), add "By Ingredient" / "By Name" sub-tabs inside the recipe card, and unify all filter control colors to the GroceryGenius green/purple palette.

**Architecture:** All changes are confined to `frontend/src/App.tsx` and the 6 locale JSON files. Two new state variables (`recipeSubTab`, `showFilters`) drive the sub-tab and filter panel. An inline `renderFilterControls()` function returns the shared 2×2 filter grid used by both the desktop popover and mobile bottom sheet. The desktop popover uses `position: absolute` anchored to the Filters button wrapper; the mobile bottom sheet uses `position: fixed`.

**Tech Stack:** React 18, TypeScript, react-i18next, inline styles (no CSS modules), no new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add 2 state vars, 2 helpers, 1 effect, 1 ref, `renderFilterControls()`, replace mobile recipe section, replace desktop recipe section |
| `frontend/src/locales/en/translation.json` | Add 9 keys under `recipes` |
| `frontend/src/locales/es/translation.json` | Same 9 keys, Spanish |
| `frontend/src/locales/fr/translation.json` | Same 9 keys, French |
| `frontend/src/locales/de/translation.json` | Same 9 keys, German |
| `frontend/src/locales/zh/translation.json` | Same 9 keys, Chinese |
| `frontend/src/locales/ja/translation.json` | Same 9 keys, Japanese |

---

## Task 1: Add i18n keys to all 6 locale files

**Files:**
- Modify: `frontend/src/locales/en/translation.json`
- Modify: `frontend/src/locales/es/translation.json`
- Modify: `frontend/src/locales/fr/translation.json`
- Modify: `frontend/src/locales/de/translation.json`
- Modify: `frontend/src/locales/zh/translation.json`
- Modify: `frontend/src/locales/ja/translation.json`

- [ ] **Step 1: Add keys to English locale**

In `frontend/src/locales/en/translation.json`, find the `"recipes"` object and add these 9 keys anywhere inside it (e.g. after `"moreIngredients": "more..."`):

```json
"subTabIngredient": "By Ingredient",
"subTabName": "By Name",
"filtersButton": "Filters",
"clearFilters": "Clear filters",
"resetAll": "Reset all",
"extraIngredients": "Extra Ingredients",
"searchByNamePlaceholder": "e.g. pasta primavera…",
"searchByNameLabel": "Recipe Name",
"searchRecipes": "Search Recipes"
```

- [ ] **Step 2: Add keys to Spanish locale**

In `frontend/src/locales/es/translation.json`, inside the `"recipes"` object:

```json
"subTabIngredient": "Por Ingrediente",
"subTabName": "Por Nombre",
"filtersButton": "Filtros",
"clearFilters": "Borrar filtros",
"resetAll": "Restablecer todo",
"extraIngredients": "Ingredientes Adicionales",
"searchByNamePlaceholder": "p. ej. pasta primavera…",
"searchByNameLabel": "Nombre de la receta",
"searchRecipes": "Buscar Recetas"
```

- [ ] **Step 3: Add keys to French locale**

In `frontend/src/locales/fr/translation.json`, inside the `"recipes"` object:

```json
"subTabIngredient": "Par Ingrédient",
"subTabName": "Par Nom",
"filtersButton": "Filtres",
"clearFilters": "Effacer les filtres",
"resetAll": "Tout réinitialiser",
"extraIngredients": "Ingrédients supplémentaires",
"searchByNamePlaceholder": "ex. pasta primavera…",
"searchByNameLabel": "Nom de la recette",
"searchRecipes": "Rechercher des recettes"
```

- [ ] **Step 4: Add keys to German locale**

In `frontend/src/locales/de/translation.json`, inside the `"recipes"` object:

```json
"subTabIngredient": "Nach Zutat",
"subTabName": "Nach Name",
"filtersButton": "Filter",
"clearFilters": "Filter löschen",
"resetAll": "Alles zurücksetzen",
"extraIngredients": "Zusätzliche Zutaten",
"searchByNamePlaceholder": "z.B. Pasta Primavera…",
"searchByNameLabel": "Rezeptname",
"searchRecipes": "Rezepte suchen"
```

- [ ] **Step 5: Add keys to Chinese locale**

In `frontend/src/locales/zh/translation.json`, inside the `"recipes"` object:

```json
"subTabIngredient": "按食材",
"subTabName": "按名称",
"filtersButton": "筛选",
"clearFilters": "清除筛选",
"resetAll": "全部重置",
"extraIngredients": "额外食材",
"searchByNamePlaceholder": "例如：意大利面…",
"searchByNameLabel": "菜谱名称",
"searchRecipes": "搜索菜谱"
```

- [ ] **Step 6: Add keys to Japanese locale**

In `frontend/src/locales/ja/translation.json`, inside the `"recipes"` object:

```json
"subTabIngredient": "食材で検索",
"subTabName": "名前で検索",
"filtersButton": "フィルター",
"clearFilters": "フィルターをクリア",
"resetAll": "すべてリセット",
"extraIngredients": "追加食材",
"searchByNamePlaceholder": "例：パスタプリマベーラ…",
"searchByNameLabel": "レシピ名",
"searchRecipes": "レシピを検索"
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/en/translation.json \
        frontend/src/locales/es/translation.json \
        frontend/src/locales/fr/translation.json \
        frontend/src/locales/de/translation.json \
        frontend/src/locales/zh/translation.json \
        frontend/src/locales/ja/translation.json
git commit -m "feat(i18n): add recipe filter panel + sub-tab translation keys"
```

---

## Task 2: Add state variables, ref, helpers, and click-outside effect to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx` (state block ~line 141, before the `return` statement)

- [ ] **Step 1: Add two new state variables**

Find this block in App.tsx (around line 141):

```tsx
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeServings, setRecipeServings] = useState<number | ''>(2);
  const [recipeDifficulty, setRecipeDifficulty] = useState<'flexible' | 'easy' | 'medium' | 'hard'>('flexible');
```

Add two new lines immediately after `recipeDifficulty`:

```tsx
  const [recipeSubTab, setRecipeSubTab] = useState<'ingredient' | 'name'>('ingredient');
  const [showFilters, setShowFilters] = useState(false);
```

- [ ] **Step 2: Add filterPanelRef**

Find the existing refs block (search for `const recipesRef = useRef`). Add a new ref on the line immediately before it:

```tsx
  const filterPanelRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Add activeFilterCount computed value and handleResetFilters**

Find `const addPantryToIngredients` (around line 989). Add these two declarations immediately before it:

```tsx
  const activeFilterCount = [
    dietaryFilter !== '',
    recipeDifficulty !== 'flexible',
    typeof recipeServings === 'number' && recipeServings !== 2,
    recipeMode !== 'loose',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setDietaryFilter('');
    setRecipeDifficulty('flexible');
    setRecipeServings(2);
    handleRecipeModeChange('loose');
    setShowFilters(false);
  };
```

- [ ] **Step 4: Add click-outside effect for desktop popover**

Find the existing `useEffect` blocks (search for `useEffect`). Add this new effect after the last existing one that deals with `isMobile` or window resize:

```tsx
  useEffect(() => {
    if (!showFilters || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, isMobile]);
```

- [ ] **Step 5: Add renderFilterControls inline function**

Find `const addPantryToIngredients` again. Add this block immediately before it (after `handleResetFilters`):

```tsx
  const renderFilterControls = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
      {/* Dietary Preference */}
      <div>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          {t('recipes.dietaryPreferences')}
        </div>
        <select
          data-tour="recipes-dietary-filter"
          value={dietaryFilter}
          onChange={e => setDietaryFilter(e.target.value)}
          style={{ width: '100%', padding: '0.42rem 0.5rem', border: '1.5px solid #e5e7eb', borderRadius: '7px', fontSize: '0.8rem', background: 'white', boxSizing: 'border-box' as const }}
        >
          <option value="">{t('recipes.dietary.all')}</option>
          {dietaryFilter && !PRESET_LABEL_MAP[dietaryFilter] && !customDietaryLabels.find(l => l.id === dietaryFilter) && (
            <option value={dietaryFilter}>📋 {dietaryFilter}</option>
          )}
          <option value="vegetarian">{t('recipes.dietary.vegetarian')}</option>
          <option value="vegan">{t('recipes.dietary.vegan')}</option>
          <option value="gluten-free">{t('recipes.dietary.glutenFree')}</option>
          <option value="keto">{t('recipes.dietary.keto')}</option>
          <option value="diabetic-friendly">{t('recipes.dietary.diabeticFriendly')}</option>
          <option value="heart-healthy">{t('recipes.dietary.heartHealthy')}</option>
          {customDietaryLabels.map(custom => (
            <option key={custom.id} value={custom.id}>✨ {custom.label}</option>
          ))}
        </select>
      </div>
      {/* Servings */}
      <div>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          {t('recipes.servings')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#f3f4f6', borderRadius: '7px', padding: '0.3rem 0.55rem', width: 'fit-content' }}>
          <button
            onClick={() => setRecipeServings(Math.max(1, (typeof recipeServings === 'number' ? recipeServings : 2) - 1))}
            style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '5px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >−</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' as const }}>{recipeServings}</span>
          <button
            onClick={() => setRecipeServings(Math.min(12, (typeof recipeServings === 'number' ? recipeServings : 2) + 1))}
            style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '5px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
        </div>
      </div>
      {/* Difficulty */}
      <div>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          {t('recipes.difficulty')}
        </div>
        <div style={{ display: 'flex', gap: '0.18rem', background: '#f3f4f6', borderRadius: '7px', padding: '0.16rem' }}>
          {(['flexible', 'easy', 'medium', 'hard'] as const).map(level => (
            <button key={level} aria-pressed={recipeDifficulty === level} onClick={() => setRecipeDifficulty(level)}
              style={{
                flex: 1, padding: '0.3rem 0',
                background: recipeDifficulty === level ? 'linear-gradient(45deg, #10b981, #059669)' : 'transparent',
                color: recipeDifficulty === level ? 'white' : '#6b7280',
                border: 'none', borderRadius: '5px', cursor: 'pointer',
                fontWeight: recipeDifficulty === level ? 700 : 500, fontSize: '0.68rem',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {t(`recipes.difficultyLevelShort.${level}`)}
            </button>
          ))}
        </div>
      </div>
      {/* Extra Ingredients (Strict/Loose) */}
      <div>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          {t('recipes.extraIngredients')}
        </div>
        <div style={{ display: 'flex', gap: '0.18rem', background: '#f3f4f6', borderRadius: '7px', padding: '0.16rem' }}>
          {(['loose', 'strict'] as const).map(mode => (
            <button key={mode} aria-pressed={recipeMode === mode} onClick={() => handleRecipeModeChange(mode)}
              style={{
                flex: 1, padding: '0.3rem 0',
                background: recipeMode === mode ? 'linear-gradient(45deg, #10b981, #059669)' : 'transparent',
                color: recipeMode === mode ? 'white' : '#6b7280',
                border: 'none', borderRadius: '5px', cursor: 'pointer',
                fontWeight: recipeMode === mode ? 700 : 500, fontSize: '0.68rem',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {mode === 'loose' ? t('recipes.modeLoose') : t('recipes.modeStrict')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors from the new declarations.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add recipeSubTab, showFilters state, filter helpers and renderFilterControls"
```

---

## Task 3: Update handleGetRecipes for sub-tab awareness

**Files:**
- Modify: `frontend/src/App.tsx` (~line 907)

- [ ] **Step 1: Replace the validation guard in handleGetRecipes**

Find this block (around line 908):

```tsx
    if (ingredientTags.length === 0 && !recipeSearchQuery.trim()) {
      setErrorMsg('Please add ingredients or enter a recipe search.');
      return;
    }
```

Replace with:

```tsx
    if (recipeSubTab === 'ingredient' && ingredientTags.length === 0) {
      setErrorMsg(t('recipes.emptyStatePrompt'));
      return;
    }
    if (recipeSubTab === 'name' && !recipeSearchQuery.trim()) {
      setErrorMsg(t('recipes.emptyStatePrompt'));
      return;
    }
```

- [ ] **Step 2: Replace the ingredient list construction in handleGetRecipes**

Find this block (around line 930):

```tsx
      const allIngredients = recipeSearchQuery.trim()
        ? [recipeSearchQuery, ...ingredientTags]
        : ingredientTags;
```

Replace with:

```tsx
      const allIngredients = recipeSubTab === 'name'
        ? [recipeSearchQuery.trim()]
        : ingredientTags;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: handleGetRecipes respects recipeSubTab — By Name sends only query, By Ingredient sends tags"
```

---

## Task 4: Replace mobile recipe tab JSX

**Files:**
- Modify: `frontend/src/App.tsx` (mobile branch of recipe tab, roughly lines 2844–2995)

The mobile branch is the `{isMobile ? ( <> ... </> ) : (` section inside the recipe card. Replace the entire contents of the mobile `<>...</>` (everything between `{isMobile ? (` and `) : (`) with the following.

- [ ] **Step 1: Replace the mobile recipe section**

Find the opening of the mobile branch:

```tsx
              {isMobile ? (
                <>
                  {/* Row 1: title + pantry + clear — 3 items, never overflows */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
```

Replace the entire mobile branch content (up to but not including `) : (`) with:

```tsx
              {isMobile ? (
                <>
                  {/* Sub-tab toggle */}
                  <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '3px', marginBottom: '0.85rem' }}>
                    {(['ingredient', 'name'] as const).map(tab => (
                      <button
                        key={tab}
                        role="tab"
                        aria-selected={recipeSubTab === tab}
                        onClick={() => setRecipeSubTab(tab)}
                        style={{
                          flex: 1, padding: '0.38rem 0',
                          background: recipeSubTab === tab ? 'linear-gradient(45deg, #10b981, #059669)' : 'transparent',
                          color: recipeSubTab === tab ? 'white' : '#6b7280',
                          border: 'none', borderRadius: '7px', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: recipeSubTab === tab ? 700 : 500,
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {tab === 'ingredient' ? `🥘 ${t('recipes.subTabIngredient')}` : `🔍 ${t('recipes.subTabName')}`}
                      </button>
                    ))}
                  </div>

                  {/* Toolbar: pantry (ingredient tab only) + filters button + action button */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    {recipeSubTab === 'ingredient' && pantry.length > 0 && (
                      <button data-tour="recipes-use-pantry-btn" onClick={addPantryToIngredients} style={{
                        padding: '0.42rem 0.65rem', background: '#8b5cf6', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap'
                      }}>📦 {t('recipes.addPantryItems')}</button>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        aria-expanded={showFilters}
                        aria-controls="recipe-filter-panel"
                        onClick={() => setShowFilters(v => !v)}
                        style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '0.42rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        ⚙️ {t('recipes.filtersButton')}
                        {activeFilterCount > 0 && (
                          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '10px', padding: '0.05rem 0.4rem', fontSize: '0.7rem' }}>{activeFilterCount}</span>
                        )}
                      </button>
                      <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }}
                        style={{ padding: '0.42rem 0.6rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        ✕ {t('common.clearAll')}
                      </button>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  {activeFilterCount > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {dietaryFilter && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {customDietaryLabels.find(l => l.id === dietaryFilter)?.label || PRESET_LABEL_MAP[dietaryFilter] || dietaryFilter}
                          <button onClick={() => setDietaryFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {recipeDifficulty !== 'flexible' && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {t(`recipes.difficultyLevel.${recipeDifficulty}`)}
                          <button onClick={() => setRecipeDifficulty('flexible')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {typeof recipeServings === 'number' && recipeServings !== 2 && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {recipeServings} {t('recipes.servings')}
                          <button onClick={() => setRecipeServings(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {recipeMode !== 'loose' && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {t('recipes.modeStrict')}
                          <button onClick={() => handleRecipeModeChange('loose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      <button onClick={handleResetFilters}
                        style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        {t('recipes.clearFilters')}
                      </button>
                    </div>
                  )}

                  {/* BY INGREDIENT content */}
                  {recipeSubTab === 'ingredient' && (
                    <>
                      {/* Ingredient tag chips */}
                      {ingredientTags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          {ingredientTags.map(tag => (
                            <span key={tag} style={{
                              background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white',
                              padding: '0.4rem 0.75rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem'
                            }}>
                              {tag}
                              <button onClick={() => setIngredientTags(ingredientTags.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Ingredient input */}
                      <input data-tour="recipes-ingredient-input" type="text" placeholder={t('recipes.ingredientsPlaceholder')}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
                            if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' as const }}
                      />
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => { setCameraSource('recipes'); setShowImageUpload(true); }}
                          style={{ padding: '0.75rem 0.9rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                          📷 {t('recipes.scanIngredients')}
                        </button>
                        <button onClick={handleGetRecipes} disabled={recipeLoading}
                          style={{ flex: 1, padding: '0.75rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                          {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🍳 ${t('recipes.getRecipes')}`}
                        </button>
                      </div>
                    </>
                  )}

                  {/* BY NAME content */}
                  {recipeSubTab === 'name' && (
                    <>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                        {t('recipes.searchByNameLabel')}
                      </div>
                      <input
                        type="text"
                        placeholder={t('recipes.searchByNamePlaceholder')}
                        value={recipeSearchQuery}
                        onChange={e => setRecipeSearchQuery(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
                        style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' as const }}
                      />
                      <button onClick={handleGetRecipes} disabled={recipeLoading}
                        style={{ width: '100%', padding: '0.75rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                        {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🔍 ${t('recipes.searchRecipes')}`}
                      </button>
                    </>
                  )}

                  {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #dc2626', marginTop: '0.75rem' }}>{errorMsg}</div>}

                  {/* Mobile bottom sheet for filters */}
                  {showFilters && (
                    <>
                      <div
                        onClick={() => setShowFilters(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }}
                      />
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('recipes.filtersButton')}
                        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'white', borderRadius: '16px 16px 0 0', padding: '1rem 1rem 2.5rem' }}
                      >
                        <div style={{ width: '36px', height: '4px', background: '#d1d5db', borderRadius: '2px', margin: '0 auto 1rem' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t('recipes.filtersButton')}</span>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button onClick={handleResetFilters}
                              style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                              {t('recipes.resetAll')}
                            </button>
                            <button onClick={() => setShowFilters(false)}
                              style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>✕</button>
                          </div>
                        </div>
                        {renderFilterControls()}
                      </div>
                    </>
                  )}
                </>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: replace mobile recipe tab with sub-tabs + filter bottom sheet"
```

---

## Task 5: Replace desktop recipe tab JSX

**Files:**
- Modify: `frontend/src/App.tsx` (desktop branch of recipe tab, roughly lines 2997–3122)

The desktop branch is everything between `) : (` and the closing `)}` of the isMobile ternary.

- [ ] **Step 1: Replace the desktop recipe section**

Find the start of the desktop branch (search for `{/* DESKTOP — unchanged from original */}`):

```tsx
                  {/* DESKTOP — unchanged from original */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
```

Replace the entire desktop `<>...</>` content with:

```tsx
                  {/* Sub-tab toggle */}
                  <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '3px', width: 'fit-content', marginBottom: '0.85rem' }}>
                    {(['ingredient', 'name'] as const).map(tab => (
                      <button
                        key={tab}
                        role="tab"
                        aria-selected={recipeSubTab === tab}
                        onClick={() => setRecipeSubTab(tab)}
                        style={{
                          padding: '0.3rem 1.1rem',
                          background: recipeSubTab === tab ? 'linear-gradient(45deg, #10b981, #059669)' : 'transparent',
                          color: recipeSubTab === tab ? 'white' : '#6b7280',
                          border: 'none', borderRadius: '7px', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: recipeSubTab === tab ? 700 : 500,
                          transition: 'background 0.15s, color 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tab === 'ingredient' ? `🥘 ${t('recipes.subTabIngredient')}` : `🔍 ${t('recipes.subTabName')}`}
                      </button>
                    ))}
                  </div>

                  {/* Toolbar row: ingredient label / pantry / scan / filters (with popover) / get-recipes / clear */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    {recipeSubTab === 'ingredient' && (
                      <label style={{ fontWeight: 600 }}>🥘 {t('recipes.whatIngredientsLabel')}</label>
                    )}
                    {recipeSubTab === 'ingredient' && pantry.length > 0 && (
                      <button data-tour="recipes-use-pantry-btn" onClick={addPantryToIngredients} style={{
                        padding: '0.35rem 0.75rem', background: '#8b5cf6', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}>📦 {t('recipes.addPantryItems')}</button>
                    )}
                    {recipeSubTab === 'ingredient' && (
                      <button onClick={() => { setCameraSource('recipes'); setShowImageUpload(true); }}
                        style={{ padding: '0.35rem 0.75rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📷 {t('recipes.scanIngredients')}
                      </button>
                    )}

                    {/* Filters button + floating popover */}
                    <div ref={filterPanelRef} style={{ position: 'relative' }}>
                      <button
                        aria-expanded={showFilters}
                        aria-controls="recipe-filter-panel"
                        onClick={() => setShowFilters(v => !v)}
                        style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        ⚙️ {t('recipes.filtersButton')}
                        {activeFilterCount > 0 && (
                          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '10px', padding: '0.05rem 0.4rem', fontSize: '0.72rem' }}>{activeFilterCount}</span>
                        )}
                      </button>

                      {showFilters && (
                        <div
                          id="recipe-filter-panel"
                          role="region"
                          aria-label={t('recipes.filtersButton')}
                          style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: '320px', background: 'white',
                            border: '1.5px solid #e5e7eb', borderRadius: '12px',
                            padding: '1rem', zIndex: 100,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                          }}
                        >
                          {/* Caret tail */}
                          <div style={{
                            position: 'absolute', top: '-7px', right: '18px',
                            width: '12px', height: '12px', background: 'white',
                            borderLeft: '1.5px solid #e5e7eb', borderTop: '1.5px solid #e5e7eb',
                            transform: 'rotate(45deg)',
                          }} />
                          {renderFilterControls()}
                        </div>
                      )}
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button onClick={handleGetRecipes} disabled={recipeLoading}
                        style={{ padding: '0.4rem 1.5rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {recipeLoading
                          ? `⏳ ${t('recipes.generating')}`
                          : recipeSubTab === 'name'
                            ? `🔍 ${t('recipes.searchRecipes')}`
                            : `🍳 ${t('recipes.getRecipes')}`}
                      </button>
                      <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }}
                        style={{ padding: '0.4rem 0.75rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {t('common.clearAll')}
                      </button>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  {activeFilterCount > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {dietaryFilter && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {customDietaryLabels.find(l => l.id === dietaryFilter)?.label || PRESET_LABEL_MAP[dietaryFilter] || dietaryFilter}
                          <button onClick={() => setDietaryFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {recipeDifficulty !== 'flexible' && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {t(`recipes.difficultyLevel.${recipeDifficulty}`)}
                          <button onClick={() => setRecipeDifficulty('flexible')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {typeof recipeServings === 'number' && recipeServings !== 2 && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {recipeServings} {t('recipes.servings')}
                          <button onClick={() => setRecipeServings(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      {recipeMode !== 'loose' && (
                        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {t('recipes.modeStrict')}
                          <button onClick={() => handleRecipeModeChange('loose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      )}
                      <button onClick={handleResetFilters}
                        style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.18rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        {t('recipes.clearFilters')}
                      </button>
                    </div>
                  )}

                  {/* BY INGREDIENT content */}
                  {recipeSubTab === 'ingredient' && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {ingredientTags.map(tag => (
                          <span key={tag} style={{
                            background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white',
                            padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                          }}>
                            {tag}
                            <button onClick={() => setIngredientTags(ingredientTags.filter(t => t !== tag))}
                              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                          </span>
                        ))}
                      </div>
                      <input data-tour="recipes-ingredient-input" type="text" placeholder={t('recipes.ingredientsPlaceholder')}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
                            if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        style={{ width: '100%', padding: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' as const }}
                      />
                    </>
                  )}

                  {/* BY NAME content */}
                  {recipeSubTab === 'name' && (
                    <>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>🔍 {t('recipes.searchByNameLabel')}</label>
                      <input
                        type="text"
                        placeholder={t('recipes.searchByNamePlaceholder')}
                        value={recipeSearchQuery}
                        onChange={e => setRecipeSearchQuery(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
                        style={{ width: '100%', padding: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' as const }}
                      />
                    </>
                  )}

                  {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>{errorMsg}</div>}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: replace desktop recipe tab with sub-tabs + filter popover"
```

---

## Task 6: Manual verification and final push

**Files:** None — verification only.

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify desktop — filter popover**

Open the app in a browser at full desktop width. Go to the Recipes tab.
- Confirm sub-tab toggle shows "🥘 By Ingredient" (active/green) and "🔍 By Name".
- Click "⚙️ Filters" — a floating popover should appear below the button WITHOUT pushing the ingredient input down.
- Confirm popover has: Dietary (select), Servings (stepper), Difficulty (Any/Easy/Med/Hard segmented), Extra Ingredients (Loose/Strict segmented).
- Confirm ALL active states are green gradient, not the old multi-color per-difficulty scheme.
- Select a dietary filter and a difficulty — confirm the badge count on the Filters button updates (e.g. "Filters 2").
- Confirm purple chips appear below the toolbar with the active filter labels and × buttons.
- Click outside the popover — it should close.
- Click × on a chip — that filter resets to default and chip disappears.
- Click "Clear filters" — all chips disappear.

- [ ] **Step 3: Verify desktop — sub-tabs**

- Click "🔍 By Name" sub-tab — ingredient input disappears, a "Recipe Name" text input appears.
- Type a recipe name, press Enter or click the get-recipes button — recipes generate (button label changes to "🔍 Search Recipes").
- Switch back to "🥘 By Ingredient" — ingredient tags are still there (state preserved).
- Filter state (dietary, etc.) persists across tab switches.

- [ ] **Step 4: Verify mobile — bottom sheet**

Resize browser to <768px or use DevTools mobile mode.
- Confirm sub-tab toggle renders full-width.
- Click "⚙️ Filters" — a bottom sheet slides up from the bottom with a dim overlay behind it.
- Confirm sheet has: drag handle, "Filters" title, "Reset all" button, ✕ close button.
- Confirm filter controls (Dietary, Servings, Difficulty, Extra Ingredients) are inside the sheet.
- Tap the dim overlay — sheet closes.
- Click "Reset all" — all filters reset to defaults and sheet closes.
- Confirm no old strict/loose toggle appears anywhere in the mobile recipe UI outside the sheet.

- [ ] **Step 5: Verify i18n**

Switch the app language to Spanish (via the language switcher). Confirm:
- Sub-tab labels show "Por Ingrediente" / "Por Nombre".
- Filter button shows "Filtros".
- Filter chips and "Borrar filtros" render in Spanish.
- Switch to another language (French, German) and spot-check the same labels.

- [ ] **Step 6: Push to dev**

```bash
git push origin dev
```
