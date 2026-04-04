# Recipe Generator Mobile UI Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the recipe generator control panel so it doesn't overflow or look cluttered on mobile — replacing the broken multi-item flex row with a single compact card layout, mobile-only.

**Architecture:** Single `isMobile` ternary inside the existing `currentTab === 'recipes'` block in `App.tsx`. Mobile path renders a redesigned compact card; desktop path keeps existing JSX verbatim. No new components, no new files.

**Tech Stack:** React, TypeScript, inline styles, `isMobile` boolean already in scope

---

## Files

- Modify: `frontend/src/App.tsx` lines 2644–2794 (the recipe control panel `<div>`)

---

### Task 1: Replace the recipe control panel with mobile/desktop conditional layout

**Files:**
- Modify: `frontend/src/App.tsx:2644-2794`

- [ ] **Step 1: Open `frontend/src/App.tsx` and locate the recipe control panel**

  Find line 2644 — the outer `<div>` of the recipe control panel:
  ```tsx
  <div style={{ background: cardBg, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
  ```
  This block ends at line 2794 (`</div>`). You will replace the entire block.

- [ ] **Step 2: Replace lines 2644–2794 with the mobile/desktop conditional block**

  Replace the entire block from line 2644 to line 2794 (inclusive) with:

  ```tsx
  <div style={{ background: cardBg, padding: isMobile ? '1rem' : '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
    {isMobile ? (
      <>
        {/* Row 1: title + pantry + clear — 3 items, never overflows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <label style={{ fontWeight: '700', fontSize: '0.9rem', flex: 1 }}>🥘 {t('recipes.whatIngredientsLabel')}</label>
          {pantry.length > 0 && (
            <button onClick={addPantryToIngredients} style={{
              padding: '0.35rem 0.6rem', background: '#8b5cf6', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', whiteSpace: 'nowrap'
            }}>📦 {t('recipes.addPantryItems')}</button>
          )}
          <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.6rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}>
            ✕ {t('common.clearAll')}
          </button>
        </div>

        {/* Ingredient tag chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
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

        {/* Ingredient input */}
        <input type="text" placeholder={t('recipes.ingredientsPlaceholder')} onKeyPress={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
            if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
            (e.target as HTMLInputElement).value = '';
          }
        }} style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} />

        {/* Mode toggle — full width below input */}
        <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '3px', marginBottom: '0.75rem' }}>
          {([['strict', 'Strict — only my items'], ['loose', 'Loose — allow extras']] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={recipeMode === mode}
              onClick={() => handleRecipeModeChange(mode)}
              style={{
                flex: 1, padding: '0.4rem 0.5rem',
                background: recipeMode === mode ? '#1f2937' : 'transparent',
                color: recipeMode === mode ? 'white' : '#6b7280',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: '600',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap', textAlign: 'center' as const
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f3f4f6', margin: '0.75rem 0' }} />

        {/* Search */}
        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>🔍 {t('recipes.searchLabel')}</div>
        <input type="text" placeholder={t('recipes.searchPlaceholder')} value={recipeSearchQuery}
          onChange={(e) => setRecipeSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
          style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} />

        {/* Dietary */}
        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Dietary</div>
        <select value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}>
          <option value="">{t('recipes.dietary.all')}</option>
          <option value="vegetarian">{t('recipes.dietary.vegetarian')}</option>
          <option value="vegan">{t('recipes.dietary.vegan')}</option>
          <option value="gluten-free">{t('recipes.dietary.glutenFree')}</option>
          <option value="keto">{t('recipes.dietary.keto')}</option>
          <option value="diabetic-friendly">{t('recipes.dietary.diabeticFriendly')}</option>
          <option value="heart-healthy">{t('recipes.dietary.heartHealthy')}</option>
        </select>

        {/* Difficulty + Servings — 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Difficulty</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#f3f4f6', borderRadius: '10px', padding: '0.2rem' }}>
              {(['flexible', 'easy', 'medium', 'hard'] as const).map((level) => {
                const active = recipeDifficulty === level;
                const mobileLabel: Record<string, string> = { flexible: 'Flex', easy: 'Easy', medium: 'Med', hard: 'Hard' };
                const colors: Record<string, { bg: string; text: string }> = {
                  flexible: { bg: '#6366f1', text: 'white' },
                  easy:     { bg: '#10b981', text: 'white' },
                  medium:   { bg: '#f59e0b', text: 'white' },
                  hard:     { bg: '#ef4444', text: 'white' },
                };
                return (
                  <button
                    key={level}
                    onClick={() => setRecipeDifficulty(level)}
                    style={{
                      flex: 1, padding: '0.35rem 0',
                      background: active ? colors[level].bg : 'transparent',
                      color: active ? colors[level].text : '#6b7280',
                      border: 'none', borderRadius: '7px', cursor: 'pointer',
                      fontWeight: active ? '700' : '500', fontSize: '0.7rem',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                  >
                    {mobileLabel[level]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Servings</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f3f4f6', borderRadius: '10px', padding: '0.4rem 0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setRecipeServings(Math.max(1, (recipeServings as number) - 1))}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', minWidth: '24px', textAlign: 'center' as const }}>{recipeServings}</span>
              <button
                onClick={() => setRecipeServings(Math.min(12, (recipeServings as number) + 1))}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => { setCameraSource('recipes'); setShowImageUpload(true); }}
            style={{ padding: '0.75rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
            📷 {t('recipes.scanIngredients')}
          </button>
          <button onClick={handleGetRecipes} disabled={recipeLoading}
            style={{ flex: 1, padding: '0.75rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
            {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🍳 ${t('recipes.getRecipes')}`}
          </button>
        </div>

        {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #dc2626', marginTop: '0.75rem' }}>{errorMsg}</div>}
      </>
    ) : (
      <>
        {/* DESKTOP — unchanged from original */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <label style={{ fontWeight: '600' }}>🥘 {t('recipes.whatIngredientsLabel')}</label>
          {pantry.length > 0 && (
            <button onClick={addPantryToIngredients} style={{
              padding: '0.35rem 0.75rem', background: '#8b5cf6', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
            }}>📦 {t('recipes.addPantryItems')}</button>
          )}
          <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '3px' }}>
            {([['strict', 'Use only my ingredients'], ['loose', 'Allow extras']] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={recipeMode === mode}
                onClick={() => handleRecipeModeChange(mode)}
                style={{
                  padding: '0.25rem 0.65rem',
                  background: recipeMode === mode ? '#1f2937' : 'transparent',
                  color: recipeMode === mode ? 'white' : '#6b7280',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: '600',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }}
            style={{ marginLeft: 'auto', padding: '0.25rem 0.65rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}>
            {t('common.clearAll')}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
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
        <input type="text" placeholder={t('recipes.ingredientsPlaceholder')} onKeyPress={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
            if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
            (e.target as HTMLInputElement).value = '';
          }
        }} style={{ width: '100%', padding: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }} />
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>🔍 {t('recipes.searchLabel')}</label>
        <input type="text" placeholder={t('recipes.searchPlaceholder')} value={recipeSearchQuery}
          onChange={(e) => setRecipeSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
          style={{ width: '100%', padding: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }} />
        <div className="recipe-controls-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}
            style={{ padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', minWidth: '200px' }}>
            <option value="">{t('recipes.dietary.all')}</option>
            <option value="vegetarian">{t('recipes.dietary.vegetarian')}</option>
            <option value="vegan">{t('recipes.dietary.vegan')}</option>
            <option value="gluten-free">{t('recipes.dietary.glutenFree')}</option>
            <option value="keto">{t('recipes.dietary.keto')}</option>
            <option value="diabetic-friendly">{t('recipes.dietary.diabeticFriendly')}</option>
            <option value="heart-healthy">{t('recipes.dietary.heartHealthy')}</option>
          </select>
          <div className="recipe-servings-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚖️</span>
            <label style={{ fontWeight: '600' }}>{t('recipes.servings')}:</label>
            <input type="number" min="1" max="12" value={recipeServings}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') { setRecipeServings('' as any); }
                else { setRecipeServings(Math.max(1, Math.min(12, parseInt(val) || 2))); }
              }}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) { setRecipeServings(2); }
              }}
              style={{ width: '60px', padding: '0.5rem', border: '2px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f3f4f6', borderRadius: '10px', padding: '0.25rem' }}>
            {(['flexible', 'easy', 'medium', 'hard'] as const).map((level) => {
              const active = recipeDifficulty === level;
              const colors: Record<string, { bg: string; text: string }> = {
                flexible: { bg: '#6366f1', text: 'white' },
                easy:     { bg: '#10b981', text: 'white' },
                medium:   { bg: '#f59e0b', text: 'white' },
                hard:     { bg: '#ef4444', text: 'white' },
              };
              return (
                <button key={level} onClick={() => setRecipeDifficulty(level)} style={{
                  padding: '0.4rem 0.75rem',
                  background: active ? colors[level].bg : 'transparent',
                  color: active ? colors[level].text : '#6b7280',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: active ? '700' : '500', fontSize: '0.8rem',
                  transition: 'background 0.2s, color 0.2s, transform 0.15s',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                  textTransform: 'capitalize', whiteSpace: 'nowrap'
                }}>
                  {level}
                </button>
              );
            })}
          </div>
          <button onClick={() => { setCameraSource('recipes'); setShowImageUpload(true); }}
            style={{ padding: '0.75rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📷 {t('recipes.scanIngredients')}
          </button>
          <button onClick={handleGetRecipes} disabled={recipeLoading}
            style={{ padding: '0.75rem 2rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: recipeLoading ? 'not-allowed' : 'pointer' }}>
            {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🍳 ${t('recipes.getRecipes')}`}
          </button>
        </div>
        {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>{errorMsg}</div>}
      </>
    )}
  </div>
  ```

- [ ] **Step 3: Verify the build compiles**

  ```bash
  cd frontend && npm run build
  ```
  Expected: no TypeScript errors, build succeeds.

  If you see a TS error about `textAlign: 'center'`, it's already typed as `const` in the plan — check the cast is present.

- [ ] **Step 4: Visual verification on mobile**

  Run the dev server:
  ```bash
  cd frontend && npm run dev
  ```
  Open `http://localhost:5173` in Chrome DevTools with device toolbar set to **iPhone SE (375×667)**.

  Verify:
  - Header row shows: label + Pantry button + Clear button — all on one line, no overflow
  - Ingredient input and mode toggle are full-width
  - Divider line visible between ingredients and filters
  - Dietary dropdown is full-width
  - Difficulty + Servings appear side-by-side in 2 columns
  - Difficulty labels show "Flex / Easy / Med / Hard" (abbreviated)
  - Servings shows `−` / number / `+` stepper
  - Scan + Get Recipes buttons fill the bottom row

- [ ] **Step 5: Visual verification on desktop**

  In the same browser, exit device toolbar (full desktop width).

  Verify: layout looks identical to before — all controls in a single flex row, full difficulty labels, number input for servings.

- [ ] **Step 6: Commit**

  ```bash
  cd .. && git add frontend/src/App.tsx && git commit -m "fix: compact mobile layout for recipe generator — fix overflow and clutter"
  ```
