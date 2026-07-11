import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../lib/apiClient';

// Mirrors the `Recipe` shape in App.tsx (recipes are not centrally typed yet;
// this duplication matches the existing pattern in components/MealPlanCalendar.tsx).
export interface Recipe {
  name: string;
  ingredients: string;
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  difficulty?: string;
  servings?: number;
  originalServings?: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  health_benefits?: string;
  budget_tip?: string;
}

export interface FavoriteRecipe extends Recipe {
  id: string;
  savedDate: string;
}

interface FavoritesContextValue {
  favorites: FavoriteRecipe[];
  setFavorites: Dispatch<SetStateAction<FavoriteRecipe[]>>;
  translatedFavoriteNames: Record<string, string>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || '/_/backend';

/**
 * Owns the `favorites` list and its translated-name cache so any section of
 * the app (Recipes tab "add to favorites" button, the Favorites tab itself,
 * the meal plan calendar, the recipe detail modal) can read/write it without
 * prop-drilling through App.tsx. Initial load/reset of `favorites` still
 * happens in App.tsx (it's interleaved with pantry/shopping/donation loading
 * and shares that effect's stale-request guarding) via the exposed
 * `setFavorites` setter.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [translatedFavoriteNames, setTranslatedFavoriteNames] = useState<Record<string, string>>({});

  // Translate saved recipe names whenever language OR favorites change
  useEffect(() => {
    if (favorites.length === 0) { setTranslatedFavoriteNames({}); return; }
    const lang = i18n.language.split('-')[0];
    const names = favorites.map(f => f.name);
    authFetch(`${API_BASE}/recipes/translate-names`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names, language: lang }),
    })
      .then(r => r.json())
      .then((translated: string[]) => {
        const map: Record<string, string> = {};
        favorites.forEach((f, i) => { map[f.id] = translated[i] ?? f.name; });
        setTranslatedFavoriteNames(map);
      })
      .catch(() => setTranslatedFavoriteNames({}));
  }, [i18n.language, favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, setFavorites, translatedFavoriteNames }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}
