import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../lib/apiClient';
import { CustomDietaryLabel } from '../../lib/supabase';

// Mirrors the `Recipe` shape in App.tsx (recipes are not centrally typed yet;
// this duplication matches the existing pattern in features/favorites for `Recipe`).
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

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export const PRESET_LABEL_MAP: Record<string, string> = {
  'vegetarian': 'Vegetarian', 'vegan': 'Vegan', 'gluten-free': 'Gluten-Free',
  'dairy-free': 'Dairy-Free', 'halal': 'Halal', 'kosher': 'Kosher',
  'keto': 'Keto', 'low-carb': 'Low-Carb', 'nut-free': 'Nut-Free', 'paleo': 'Paleo',
  'diabetic-friendly': 'Diabetic-Friendly', 'heart-healthy': 'Heart-Healthy',
};

export const COMBINED_PROFILE_KEY = '__combined__';

export function buildCombinedDietaryString(prefs: string[], customLabels: CustomDietaryLabel[]): string {
  const parts = prefs
    .map(p => PRESET_LABEL_MAP[p] ?? customLabels.find(l => l.id === p)?.label ?? null)
    .filter(Boolean) as string[];
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** Best-effort extraction of quantity/unit/name triples from a recipe's free-text ingredient lines. */
export function parseIngredients(recipe: Recipe): ParsedIngredient[] {
  const ingredients: ParsedIngredient[] = [];
  const servingScale = (recipe.originalServings && recipe.servings)
    ? recipe.servings / recipe.originalServings
    : 1;

  // Split by newlines to process each ingredient line
  const lines = recipe.ingredients.split('\n').filter(line => line.trim());

  const seen = new Set<string>();

  lines.forEach(line => {
    const cleanLine = line.trim().toLowerCase();
    if (!cleanLine || cleanLine.length < 3) return;

    // Pattern 1: Quantity + Unit + Ingredient (e.g., "2 cups flour", "1 tbsp oil")
    const pattern1 = /^(\d+(?:\/\d+)?|\d+\.\d+)\s*(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|pieces?|pcs?|slices?)\s+(?:of\s+)?(.+)$/i;
    const match1 = cleanLine.match(pattern1);

    if (match1) {
      let quantity = match1[1];
      const unit = match1[2];
      let name = match1[3].trim();

      // Handle fractions
      if (quantity.includes('/')) {
        const [num, denom] = quantity.split('/').map(Number);
        quantity = (num / denom).toFixed(2);
      }

      // Clean up the name
      name = name
        .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
        .replace(/[,;()]/g, '')
        .trim();

      if (name.length > 2 && name.length < 40 && !seen.has(name)) {
        seen.add(name);
        ingredients.push({
          name,
          quantity: parseFloat(quantity) * servingScale,
          unit: unit.toLowerCase()
        });
      }
      return;
    }

    // Pattern 2: Just Quantity + Ingredient (e.g., "2 avocados", "3 eggs", "4 tomatoes")
    const pattern2 = /^(\d+(?:\/\d+)?|\d+\.\d+)\s+(?:whole|medium|large|small)?\s*(.+)$/i;
    const match2 = cleanLine.match(pattern2);

    if (match2) {
      let quantity = match2[1];
      let name = match2[2].trim();

      // Handle fractions
      if (quantity.includes('/')) {
        const [num, denom] = quantity.split('/').map(Number);
        quantity = (num / denom).toFixed(2);
      }

      // Clean up the name
      name = name
        .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
        .replace(/[,;()]/g, '')
        .trim();

      if (name.length > 2 && name.length < 40 && !seen.has(name)) {
        seen.add(name);
        ingredients.push({
          name,
          quantity: parseFloat(quantity) * servingScale,
          unit: 'pc'
        });
      }
      return;
    }

    // Pattern 3: Ingredient with descriptive words (e.g., "large avocado", "ripe banana")
    const pattern3 = /^(?:a|an|one|some)?\s*(?:large|medium|small|ripe|fresh)?\s*(.+)$/i;
    const match3 = cleanLine.match(pattern3);

    if (match3 && !cleanLine.match(/^\d/)) {
      let name = match3[1].trim();

      // Clean up the name
      name = name
        .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
        .replace(/[,;()]/g, '')
        .trim();

      // Only add if it looks like a real ingredient (not instructions)
      if (name.length > 2 && name.length < 40 && !seen.has(name) &&
          !name.includes('mix') && !name.includes('stir') && !name.includes('cook') &&
          !name.includes('heat') && !name.includes('add') && !name.includes('serve')) {
        seen.add(name);
        ingredients.push({
          name,
          quantity: 1 * servingScale,
          unit: 'pc'
        });
      }
    }
  });

  return ingredients.slice(0, 20); // Increased from 12 to 20
}

export function calculateHealthGrade(recipe: Recipe): string {
  if (!recipe.nutrition) return 'B';
  const { calories, protein, fiber, sodium, fat } = recipe.nutrition;
  let score = 70;

  if (protein >= 25) score += 12; else if (protein >= 20) score += 10; else if (protein >= 15) score += 6;
  if (fiber >= 8) score += 12; else if (fiber >= 6) score += 8; else if (fiber >= 4) score += 4;
  if (calories > 700) score -= 15; else if (calories > 600) score -= 10; else if (calories >= 350 && calories <= 500) score += 5;
  if (sodium > 1000) score -= 15; else if (sodium > 800) score -= 10; else if (sodium < 400) score += 8;
  if (fat > 25) score -= 8; else if (fat > 20) score -= 5; else if (fat >= 10 && fat <= 15) score += 5;

  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  return 'D';
}

export function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#10b981';
  if (grade.startsWith('B')) return '#3b82f6';
  if (grade.startsWith('C')) return '#f59e0b';
  return '#ef4444';
}

interface RecipesContextValue {
  recipeLoading: boolean;
  setRecipeLoading: Dispatch<SetStateAction<boolean>>;
  recipeMode: 'loose' | 'strict';
  setRecipeMode: Dispatch<SetStateAction<'loose' | 'strict'>>;
  recipeSearchQuery: string;
  setRecipeSearchQuery: Dispatch<SetStateAction<string>>;
  recipeServings: number | '';
  setRecipeServings: Dispatch<SetStateAction<number | ''>>;
  recipeDifficulty: 'flexible' | 'easy' | 'medium' | 'hard';
  setRecipeDifficulty: Dispatch<SetStateAction<'flexible' | 'easy' | 'medium' | 'hard'>>;
  recipeSubTab: 'ingredient' | 'name';
  setRecipeSubTab: Dispatch<SetStateAction<'ingredient' | 'name'>>;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  ingredientTags: string[];
  setIngredientTags: Dispatch<SetStateAction<string[]>>;
  recipes: Recipe[];
  setRecipes: Dispatch<SetStateAction<Recipe[]>>;
  dietaryFilter: string;
  setDietaryFilter: Dispatch<SetStateAction<string>>;
  selectedRecipe: Recipe | null;
  setSelectedRecipe: Dispatch<SetStateAction<Recipe | null>>;
  showDetailedView: boolean;
  setShowDetailedView: Dispatch<SetStateAction<boolean>>;
  showSubstitution: boolean;
  setShowSubstitution: Dispatch<SetStateAction<boolean>>;
  selectedIngredient: { name: string; quantity: number; unit: string } | null;
  setSelectedIngredient: Dispatch<SetStateAction<{ name: string; quantity: number; unit: string } | null>>;
  errorMsg: string;
  setErrorMsg: Dispatch<SetStateAction<string>>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || '/_/backend';

/**
 * Owns all Recipes-tab state (generation inputs/filters, the generated
 * `recipes` list, the selected-recipe detail view, and the ingredient
 * substitution modal) so the Recipes tab, the Favorites tab (opens the same
 * detail modal), and App.tsx's image-scan handlers (which reuse
 * `recipeLoading`/`ingredientTags` while analyzing a photo, regardless of
 * whether it's routed to pantry or recipes) can all read/write it without
 * prop-drilling. Cross-cutting handlers that also need `pantry`,
 * `shoppingList`/`setShoppingList`, or `setTodayCalories` stay in App.tsx and
 * are threaded into the presentational components as props — same split as
 * DonationProvider/DonationSection for `handleDonation`.
 */
export function RecipesProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeMode, setRecipeMode] = useState<'loose' | 'strict'>(
    () => localStorage.getItem('gg_recipe_mode') === 'strict' ? 'strict' : 'loose'
  );
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeServings, setRecipeServings] = useState<number | ''>(2);
  const [recipeDifficulty, setRecipeDifficulty] = useState<'flexible' | 'easy' | 'medium' | 'hard'>('flexible');
  const [recipeSubTab, setRecipeSubTab] = useState<'ingredient' | 'name'>('ingredient');
  const [showFilters, setShowFilters] = useState(false);
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dietaryFilter, setDietaryFilter] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    name: string;
    quantity: number;
    unit: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const recipesRef = useRef<Recipe[]>([]);
  recipesRef.current = recipes;

  // When language changes: translate existing recipe cards in-place
  useEffect(() => {
    setSelectedRecipe(null);
    setShowDetailedView(false);
    const currentRecipes = recipesRef.current;
    if (currentRecipes.length === 0) return;
    setRecipeLoading(true);
    authFetch(`${API_BASE}/recipes/translate-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipes: currentRecipes, language: i18n.language }),
    })
      .then(r => r.json())
      .then((translated: Recipe[]) => { setRecipes(translated); })
      .catch(() => { /* keep existing recipes on error */ })
      .finally(() => setRecipeLoading(false));
  }, [i18n.language]);

  return (
    <RecipesContext.Provider
      value={{
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
        selectedRecipe, setSelectedRecipe,
        showDetailedView, setShowDetailedView,
        showSubstitution, setShowSubstitution,
        selectedIngredient, setSelectedIngredient,
        errorMsg, setErrorMsg,
      }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) {
    throw new Error('useRecipes must be used within a RecipesProvider');
  }
  return ctx;
}
