import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { recipesService } from '../../lib/database';
import { authFetch } from '../../lib/apiClient';
import { isExpiringSoon } from '../../lib/pantryExpiry';
import { logError } from '../../lib/errorService';
import { supabase, CustomDietaryLabel } from '../../lib/supabase';
import { useFavorites } from '../favorites/FavoritesContext';
import { safeStorage } from '../../lib/safeStorage';
import {
  useRecipes,
  parseIngredients,
  calculateHealthGrade,
  getGradeColor,
  buildCombinedDietaryString,
  COMBINED_PROFILE_KEY,
  PRESET_LABEL_MAP,
  type Recipe,
} from './RecipesContext';

// Mirrors the `PantryItem` shape in App.tsx (not centrally typed yet; this
// duplication matches the existing pattern in features/donation for `PantryItem`).
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;
}

interface RecipeSectionProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
  /** Read-only — owned by App.tsx (Pantry tab also reads/mutates it). */
  pantry: PantryItem[];
  savedProfilePrefs: string[];
  customDietaryLabels: CustomDietaryLabel[];
  /** Cross-feature: needs `shoppingList`/`setShoppingList`, which live in App.tsx. */
  onAddMissingToShopping: (recipe: Recipe) => void | Promise<void>;
  /** Cross-feature: needs `setTodayCalories`, which lives in App.tsx. */
  onLogCalories: (recipe: Recipe) => void | Promise<void>;
  /** Opens the shared image-upload modal in "recipes" mode (App.tsx owns `cameraSource`/`showImageUpload`). */
  onScanIngredients: () => void;
  onSuccess: (message: string) => void;
  onWarning: (message: string) => void;
  onInfo: (message: string) => void;
  onError: (message: string) => void;
}

/** JSX for the "Recipes" tab: ingredient/name search, filters, and the generated recipe grid. */
export function RecipeSection({
  isMobile,
  cardBg,
  mutedText,
  pantry,
  savedProfilePrefs,
  customDietaryLabels,
  onAddMissingToShopping,
  onLogCalories,
  onScanIngredients,
  onSuccess,
  onWarning,
  onInfo,
  onError,
}: RecipeSectionProps) {
  const { t, i18n } = useTranslation();
  const { favorites, setFavorites } = useFavorites();
  const {
    recipeLoading, setRecipeLoading,
    recipeMode, setRecipeMode,
    recipeSearchQuery, setRecipeSearchQuery,
    recipeServings, setRecipeServings,
    recipeDifficulty, setRecipeDifficulty,
    recipeSubTab, setRecipeSubTab,
    showFilters, setShowFilters,
    ingredientTags, setIngredientTags,
    recipes, setRecipes,
    dietaryFilter, setDietaryFilter,
    setSelectedRecipe,
    setShowDetailedView,
    errorMsg, setErrorMsg,
  } = useRecipes();

  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, isMobile, setShowFilters]);

  const addPantryToIngredients = () => {
    const names = pantry.map(item => item.name.toLowerCase());
    setIngredientTags(Array.from(new Set([...ingredientTags, ...names])));
  };

  const handleRecipeModeChange = (mode: 'loose' | 'strict') => {
    setRecipeMode(mode);
    safeStorage.setItem('gg_recipe_mode', mode);
  };

  const expiringPantryItems = pantry.filter(item => isExpiringSoon(item));

  const addExpiringPantryToIngredients = () => {
    const names = expiringPantryItems.map(item => item.name.toLowerCase());
    setIngredientTags(Array.from(new Set([...ingredientTags, ...names])));
    handleRecipeModeChange('strict');
  };

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

  const API_BASE = import.meta.env.VITE_API_URL || '/_/backend';

  const handleGetRecipes = async () => {
    if (isMobile) {
      if (recipeSubTab === 'ingredient' && ingredientTags.length === 0) {
        setErrorMsg(t('recipes.emptyStatePrompt'));
        return;
      }
      if (recipeSubTab === 'name' && !recipeSearchQuery.trim()) {
        setErrorMsg(t('recipes.emptyStatePrompt'));
        return;
      }
    } else {
      if (ingredientTags.length === 0 && !recipeSearchQuery.trim()) {
        setErrorMsg(t('recipes.emptyStatePrompt'));
        return;
      }
    }

    setRecipeLoading(true);
    setErrorMsg('');
    setRecipes([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const params = new URLSearchParams();
      if (dietaryFilter) {
        if (dietaryFilter === COMBINED_PROFILE_KEY) {
          const parts = savedProfilePrefs.map(p => {
            const cl = customDietaryLabels.find(l => l.id === p);
            return cl ? (cl.description || cl.label) : p;
          }).filter(Boolean);
          params.append('dietary', parts.join(', '));
        } else {
          const customLabel = customDietaryLabels.find(l => l.id === dietaryFilter);
          params.append('dietary', customLabel ? customLabel.description : dietaryFilter);
        }
      }
      params.append('language', i18n.language || 'en');
      if (recipeDifficulty !== 'flexible') params.append('difficulty', recipeDifficulty);

      const allIngredients = isMobile
        ? (recipeSubTab === 'name' ? [recipeSearchQuery.trim()] : ingredientTags)
        : (recipeSearchQuery.trim() ? [recipeSearchQuery.trim(), ...ingredientTags] : ingredientTags);

      // NOTE the trailing slash. The backend route is POST /recipes/ , so
      // posting to /recipes made FastAPI 307-redirect to /recipes/ — and the
      // browser dropped the Authorization header while following that
      // cross-origin redirect, so the retried request arrived tokenless and
      // 401'd ("auth failed: missing authorization header" in the backend
      // logs, always immediately after a 307 from the same client). This was
      // the real cause of "recipe generation fails on mobile but works in
      // incognito/desktop": header-stripping-on-redirect is browser-specific,
      // and every *other* endpoint has a named sub-path so none of them
      // redirect — which is why only recipe generation broke. Requesting the
      // canonical path means there is no redirect to strip anything.
      const response = await authFetch(`${API_BASE}/recipes/?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: allIngredients, strict: recipeMode === 'strict' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Scale recipes to requested servings
      const scaledRecipes = data.map((recipe: Recipe) => {
        const originalServings = recipe.servings || 2;
        const servings = typeof recipeServings === 'number' ? recipeServings : 2;
        const scale = servings / originalServings;

        return {
          ...recipe,
          servings: servings,
          originalServings: originalServings,
          nutrition: recipe.nutrition ? {
            calories: Math.round(recipe.nutrition.calories * scale),
            protein: Math.round(recipe.nutrition.protein * scale),
            carbs: Math.round(recipe.nutrition.carbs * scale),
            fat: Math.round(recipe.nutrition.fat * scale),
            fiber: Math.round(recipe.nutrition.fiber * scale),
            sodium: Math.round(recipe.nutrition.sodium * scale)
          } : undefined
        };
      });

      setRecipes(scaledRecipes);

      // Results render below the ingredient list; scroll them into view so
      // users get clear feedback that generation completed.
      setTimeout(() => {
        document.querySelector('.recipe-card-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Recipe generation error:', err);
      // Prior to this, failures here were never reported anywhere but the
      // browser console — impossible to diagnose from bug reports alone.
      // That gap is exactly how the real cause of "recipe generation fails
      // on mobile" went unnoticed: it turned out to be a 422 (see below),
      // not the 401/session-expiry theory this branch was originally added
      // for — logging is what let us tell the difference instead of guessing.
      logError(err, 'api:recipes.generate');

      if (err.name === 'AbortError') {
        setErrorMsg(t('recipes.timeoutError'));
      } else if (err instanceof Error && /API error: 422/.test(err.message)) {
        // The backend's ingredient-list cap was 30 — an outlier vs. every
        // other list field in this codebase (pantry/shopping/donation all
        // use 100-500) — while "Add Pantry Items"/"Cook What's Expiring"
        // routinely send every pantry item as an ingredient tag. Anyone with
        // a moderately stocked pantry (>30 items) tripped this on EVERY
        // device/browser, which is why it looked mobile-specific: mobile
        // usage leans harder on those bulk-add buttons than typing
        // ingredients one at a time. Backend cap raised to 100 to match: if
        // this still fires, the list is genuinely huge, so tell the user
        // directly instead of a generic message with no explanation.
        setErrorMsg(t('recipes.tooManyIngredientsError'));
      } else if (err instanceof Error && /API error: 401/.test(err.message)) {
        // Session can expire/be evicted between page load and this request.
        // Try one silent refresh; if that still doesn't produce a session,
        // the user actually needs to sign in again.
        const { data } = await supabase.auth.refreshSession();
        setErrorMsg(
          data.session ? t('recipes.generationError') : t('recipes.sessionExpiredError')
        );
      } else {
        setErrorMsg(t('recipes.generationError'));
      }
    } finally {
      setRecipeLoading(false);
    }
  };

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
          {savedProfilePrefs.length > 1 && (
            <option value={COMBINED_PROFILE_KEY}>📋 {buildCombinedDietaryString(savedProfilePrefs, customDietaryLabels)}</option>
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
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' as const }}>{typeof recipeServings === 'number' ? recipeServings : 2}</span>
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

  return (
    <>
      <div style={{ background: cardBg, padding: isMobile ? '1rem' : '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        {isMobile ? (
          <>
            {/* ── Tab switcher (iOS segmented control) ── */}
            <div role="tablist" style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '3px', marginBottom: '0.85rem' }}>
              {(['ingredient', 'name'] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={recipeSubTab === tab}
                  onClick={() => setRecipeSubTab(tab)}
                  style={{
                    flex: 1, minHeight: '44px', padding: '0.38rem 0',
                    background: recipeSubTab === tab ? 'white' : 'transparent',
                    color: recipeSubTab === tab ? '#111827' : '#6b7280',
                    border: 'none', borderRadius: '7px', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: recipeSubTab === tab ? 700 : 500,
                    boxShadow: recipeSubTab === tab ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab === 'ingredient' ? `🥘 ${t('recipes.subTabIngredient')}` : `🔍 ${t('recipes.subTabName')}`}
                </button>
              ))}
            </div>

            {/* ── Stacked toolbar — By Ingredient ── */}
            {recipeSubTab === 'ingredient' && (
              <>
                {/* Row 1: Add Pantry + Scan */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {pantry.length > 0 && (
                    <button data-tour="recipes-use-pantry-btn" onClick={addPantryToIngredients} style={{
                      flex: 1, minHeight: '44px', padding: '0.5rem 0.65rem',
                      background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                    }}>📦 {t('recipes.addPantryItems')}</button>
                  )}
                  <button onClick={onScanIngredients} style={{
                    flex: 1, minHeight: '44px', padding: '0.5rem 0.65rem',
                    background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  }}>📷 {t('recipes.scanIngredients')}</button>
                </div>
                {/* Row 1b: Cook what's expiring */}
                {pantry.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <button
                      onClick={addExpiringPantryToIngredients}
                      disabled={expiringPantryItems.length === 0}
                      title={expiringPantryItems.length === 0 ? t('recipes.noExpiringItems') : undefined}
                      style={{
                        width: '100%', minHeight: '44px', padding: '0.5rem 0.65rem',
                        background: expiringPantryItems.length === 0 ? '#d1d5db' : 'linear-gradient(45deg, #f59e0b, #d97706)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        cursor: expiringPantryItems.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.82rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      }}>🍳 {t('recipes.cookWhatsExpiring')}</button>
                  </div>
                )}
                {/* Row 2: Filters + Get Recipes */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    aria-expanded={showFilters}
                    aria-controls="recipe-filter-panel"
                    onClick={() => setShowFilters(v => !v)}
                    style={{
                      flex: 1, minHeight: '44px', position: 'relative',
                      background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                    }}
                  >
                    ⚙️ {t('recipes.filtersButton')}
                    {activeFilterCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        minWidth: '18px', height: '18px', background: '#ef4444', color: 'white',
                        borderRadius: '9px', fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      }}>{activeFilterCount}</span>
                    )}
                  </button>
                  <button onClick={handleGetRecipes} disabled={recipeLoading} style={{
                    flex: 1, minHeight: '44px', padding: '0.5rem',
                    background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontWeight: 700, cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
                  }}>
                    {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🍳 ${t('recipes.getRecipes')}`}
                  </button>
                </div>
                {/* Row 3: Clear All ghost */}
                <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }} style={{
                  width: '100%', minHeight: '44px', padding: '0.5rem',
                  background: 'transparent', border: '1px solid #d1d5db', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#6b7280',
                  marginBottom: '0.5rem',
                }}>
                  {t('common.clearAll')}
                </button>
              </>
            )}

            {/* ── Stacked toolbar — By Name ── */}
            {recipeSubTab === 'name' && (
              <>
                {/* Row 1: Filters + Search Recipes */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    aria-expanded={showFilters}
                    aria-controls="recipe-filter-panel"
                    onClick={() => setShowFilters(v => !v)}
                    style={{
                      flex: 1, minHeight: '44px', position: 'relative',
                      background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                    }}
                  >
                    ⚙️ {t('recipes.filtersButton')}
                    {activeFilterCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        minWidth: '18px', height: '18px', background: '#ef4444', color: 'white',
                        borderRadius: '9px', fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      }}>{activeFilterCount}</span>
                    )}
                  </button>
                  <button onClick={handleGetRecipes} disabled={recipeLoading} style={{
                    flex: 1, minHeight: '44px', padding: '0.5rem',
                    background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontWeight: 700, cursor: recipeLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
                  }}>
                    {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🔍 ${t('recipes.searchRecipes')}`}
                  </button>
                </div>
                {/* Row 2: Clear All ghost */}
                <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }} style={{
                  width: '100%', minHeight: '44px', padding: '0.5rem',
                  background: 'transparent', border: '1px solid #d1d5db', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#6b7280',
                  marginBottom: '0.5rem',
                }}>
                  {t('common.clearAll')}
                </button>
              </>
            )}

            {/* ── Active filter chips ── */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {dietaryFilter && (
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #c4b5fd' }}>
                    {dietaryFilter === COMBINED_PROFILE_KEY
                      ? buildCombinedDietaryString(savedProfilePrefs, customDietaryLabels)
                      : (customDietaryLabels.find(l => l.id === dietaryFilter)?.label || PRESET_LABEL_MAP[dietaryFilter] || dietaryFilter)}
                    <button onClick={() => setDietaryFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '1rem', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                )}
                {recipeDifficulty !== 'flexible' && (
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #c4b5fd' }}>
                    {t(`recipes.difficultyLevel.${recipeDifficulty}`)}
                    <button onClick={() => setRecipeDifficulty('flexible')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '1rem', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                )}
                {typeof recipeServings === 'number' && recipeServings !== 2 && (
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #c4b5fd' }}>
                    {recipeServings} {t('recipes.servings')}
                    <button onClick={() => setRecipeServings(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '1rem', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                )}
                {recipeMode !== 'loose' && (
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #c4b5fd' }}>
                    {t('recipes.modeStrict')}
                    <button onClick={() => handleRecipeModeChange('loose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '1rem', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                )}
                <button onClick={handleResetFilters} style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                  {t('recipes.clearFilters')}
                </button>
              </div>
            )}

            {/* ── By Ingredient: tags + input ── */}
            {recipeSubTab === 'ingredient' && (
              <>
                {ingredientTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    {ingredientTags.map(tag => (
                      <span key={tag} style={{
                        background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white',
                        padding: '0.4rem 0.75rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem',
                      }}>
                        {tag}
                        <button onClick={() => setIngredientTags(ingredientTags.filter(tg => tg !== tag))}
                          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {activeFilterCount > 0 && <div style={{ borderTop: '1px solid #f3f4f6', margin: '0.35rem 0 0.6rem' }} />}
                <input
                  data-tour="recipes-ingredient-input"
                  type="text"
                  placeholder={t('recipes.ingredientsPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
                      if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', boxSizing: 'border-box' as const }}
                />
              </>
            )}

            {/* ── By Name: label + input ── */}
            {recipeSubTab === 'name' && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  {t('recipes.searchByNameLabel')}
                </div>
                {activeFilterCount > 0 && <div style={{ borderTop: '1px solid #f3f4f6', margin: '0.35rem 0 0.6rem' }} />}
                <input
                  type="text"
                  placeholder={t('recipes.searchByNamePlaceholder')}
                  value={recipeSearchQuery}
                  onChange={e => setRecipeSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.875rem', boxSizing: 'border-box' as const }}
                />
              </>
            )}

            {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #dc2626', marginTop: '0.75rem' }}>{errorMsg}</div>}

            {/* ── Mobile bottom sheet for filters ── */}
            {showFilters && (
              <>
                <div onClick={() => setShowFilters(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }} />
                <div
                  id="recipe-filter-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('recipes.filtersButton')}
                  style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'white', borderRadius: '16px 16px 0 0', padding: '1rem 1rem 2.5rem' }}
                >
                  <div style={{ width: '36px', height: '4px', background: '#d1d5db', borderRadius: '2px', margin: '0 auto 1rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t('recipes.filtersButton')}</span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                        {t('recipes.resetAll')}
                      </button>
                      <button autoFocus onClick={() => setShowFilters(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>✕</button>
                    </div>
                  </div>
                  {renderFilterControls()}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* DESKTOP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '600' }}>🥘 {t('recipes.whatIngredientsLabel')}</label>
              {pantry.length > 0 && (
                <button data-tour="recipes-use-pantry-btn" onClick={addPantryToIngredients} style={{
                  padding: '0.35rem 0.75rem', background: '#8b5cf6', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
                }}>📦 {t('recipes.addPantryItems')}</button>
              )}
              {pantry.length > 0 && (
                <button
                  onClick={addExpiringPantryToIngredients}
                  disabled={expiringPantryItems.length === 0}
                  title={expiringPantryItems.length === 0 ? t('recipes.noExpiringItems') : undefined}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: expiringPantryItems.length === 0 ? '#d1d5db' : 'linear-gradient(45deg, #f59e0b, #d97706)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: expiringPantryItems.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap'
                  }}>🍳 {t('recipes.cookWhatsExpiring')}</button>
              )}
              <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '3px' }}>
                {(['strict', 'loose'] as const).map((mode) => (
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
                    {mode === 'strict' ? t('recipes.modeStrict') : t('recipes.modeLoose')}
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
                  <button onClick={() => setIngredientTags(ingredientTags.filter(tg => tg !== tag))}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                </span>
              ))}
            </div>
            <input data-tour="recipes-ingredient-input" type="text" placeholder={t('recipes.ingredientsPlaceholder')} onKeyPress={(e) => {
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
              <select data-tour="recipes-dietary-filter" value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}
                style={{ padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', minWidth: '200px' }}>
                <option value="">{t('recipes.dietary.all')}</option>
                {savedProfilePrefs.length > 1 && (
                  <option value={COMBINED_PROFILE_KEY}>📋 {buildCombinedDietaryString(savedProfilePrefs, customDietaryLabels)}</option>
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
                      whiteSpace: 'nowrap'
                    }}>
                      {t(`recipes.difficultyLevel.${level}`)}
                    </button>
                  );
                })}
              </div>
              <button onClick={onScanIngredients}
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

      {recipeLoading && recipes.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: cardBg,
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              {/* Header skeleton */}
              <div style={{
                height: '24px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '4px',
                marginBottom: '1rem'
              }} />

              {/* Content skeleton */}
              <div style={{
                height: '16px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                width: '80%'
              }} />

              <div style={{
                height: '16px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                width: '60%'
              }} />

              {/* Nutrition skeleton */}
              <div style={{
                height: '80px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '12px',
                marginTop: '1rem'
              }} />

              {/* Text at bottom */}
              <div style={{
                textAlign: 'center',
                marginTop: '1rem',
                color: '#10b981',
                fontWeight: '600'
              }}>
                🤖 {t('recipes.generatingRecipe', { n: i })}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="recipe-card-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>              {recipes.map((recipe, idx) => {
        const grade = calculateHealthGrade(recipe);
        const ingredients = parseIngredients(recipe);
        return (
          <div
            key={idx}
            className="recipe-card"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div onClick={() => { setSelectedRecipe(recipe); setShowDetailedView(true); }} style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              <div style={{
                background: cardBg,
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '1rem' : '1.5rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  gap: isMobile ? '0.75rem' : '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: isMobile ? '0.95rem' : '1.25rem',
                    fontWeight: '700',
                    flex: 1,
                    paddingRight: isMobile ? '0.5rem' : '1rem',
                    lineHeight: '1.3'
                  }}>
                    {idx + 1}. {recipe.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const exists = favorites.some(f => f.name === recipe.name);
                      if (!exists) {
                        recipesService.add({
                          name: recipe.name,
                          ingredients: recipe.ingredients,
                          instructions: recipe.instructions,
                          prep_time: recipe.prep_time,
                          cook_time: recipe.cook_time,
                          difficulty: recipe.difficulty,
                          servings: recipe.servings,
                          nutrition: recipe.nutrition,
                          health_benefits: recipe.health_benefits,
                          budget_tip: recipe.budget_tip,
                        }).then(savedRecipe => {
                          setFavorites(prev => [...prev, { ...recipe, id: savedRecipe.id, savedDate: savedRecipe.created_at }]);
                          onSuccess(t('toasts.addedToFavorites'));
                        }).catch(() => onWarning(t('toasts.failedSaveRecipe')));
                      } else {
                        onInfo(t('toasts.alreadyInFavorites'));
                      }
                    }} style={{
                      background: favorites.some(f => f.name === recipe.name) ? 'linear-gradient(45deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.15)',
                      color: favorites.some(f => f.name === recipe.name) ? 'white' : '#d97706',
                      border: '1px solid rgba(245,158,11,0.4)',
                      borderRadius: '10px',
                      padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1rem' : '1.1rem',
                      lineHeight: 1,
                    }}>💖</button>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <div style={{
                        background: getGradeColor(grade),
                        color: 'white',
                        padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: isMobile ? '0.9rem' : '1.1rem',
                        fontWeight: '700',
                        minWidth: isMobile ? '45px' : '55px',
                        textAlign: 'center'
                      }}>{grade}</div>
                      <span style={{
                        fontSize: isMobile ? '0.65rem' : '0.7rem',
                        color: mutedText,
                        fontWeight: '600'
                      }}>{t('recipes.healthGrade')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {recipe.prep_time && <span style={{ color: mutedText, fontSize: '0.875rem' }}>⏱ {recipe.prep_time}</span>}
                  {recipe.difficulty && (
                    <span style={{
                      padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem',
                      background: recipe.difficulty.toLowerCase().includes('easy') ? '#dcfce7' : '#fef3c7',
                      color: recipe.difficulty.toLowerCase().includes('easy') ? '#166534' : '#92400e'
                    }}>{recipe.difficulty}</span>
                  )}
                  <span style={{ color: mutedText, fontSize: '0.875rem' }}>👥 {recipe.servings} {t('recipes.servings')}</span>
                </div>

                {ingredients.length > 0 && (
                  <div style={{
                    background: '#f0fdf4',
                    padding: isMobile ? '0.75rem' : '1rem',
                    borderRadius: isMobile ? '8px' : '12px',
                    marginBottom: isMobile ? '0.75rem' : '1rem',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#166534',
                      marginBottom: '0.5rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>📝 {t('recipes.keyIngredients')}:</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                      gap: isMobile ? '0.25rem' : '0.5rem',
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      color: '#047857'
                    }}>
                      {ingredients.slice(0, isMobile ? 4 : 8).map((ing, i) => (
                        <div key={i}>• {Math.round(ing.quantity * 10) / 10} {ing.unit} {ing.name}</div>
                      ))}
                      {ingredients.length > (isMobile ? 4 : 8) && (
                        <div style={{ fontStyle: 'italic' }}>+ {ingredients.length - (isMobile ? 4 : 8)} {t('recipes.moreIngredients')}</div>
                      )}
                    </div>
                  </div>
                )}

                {recipe.nutrition && (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '600', color: '#059669' }}>{recipe.nutrition.calories}</div>
                        <div style={{ color: mutedText }}>{t('recipes.calories')}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '600', color: '#7c3aed' }}>{recipe.nutrition.protein}g</div>
                        <div style={{ color: mutedText }}>{t('recipes.protein')}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '600', color: '#10b981' }}>{recipe.nutrition.fiber}g</div>
                        <div style={{ color: mutedText }}>{t('recipes.fiber')}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{
                  color: '#10b981', fontWeight: '600', fontSize: '0.9rem', padding: '0.75rem',
                  background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center'
                }}>{t('recipes.clickForFullRecipe')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => onAddMissingToShopping(recipe)} style={{
                flex: isMobile ? '1 1 100%' : '1',
                padding: isMobile ? '0.75rem' : '0.75rem',
                background: 'linear-gradient(45deg, #ec4899, #8b5cf6)',
                fontSize: isMobile ? '0.875rem' : '1rem',
                color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                minWidth: isMobile ? 'auto' : '120px'
              }}>🛒 {t('recipes.addToShopping')}</button>

              {recipe.nutrition && (
                <button onClick={() => onLogCalories(recipe)} style={{
                  flex: isMobile ? '1' : 'initial',
                  padding: '0.75rem',
                  background: '#10b981', color: 'white',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '0.875rem',
                  minWidth: isMobile ? 'auto' : '80px'
                }}>📊 {t('recipes.addCalories')} ({recipe.nutrition.calories} kcal)</button>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {recipes.length === 0 && !recipeLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
          <p>{t('recipes.emptyStatePrompt')}</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{t('recipes.emptyStateTip')}</p>
        </div>
      )}
    </>
  );
}
