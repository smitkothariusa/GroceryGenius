// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// DATABASE TYPES
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  daily_calorie_goal: number;
  dietary_preferences?: string[];
  created_at: string;
  updated_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date?: string;
  added_date: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

export interface SavedRecipe {
  id: string;
  user_id: string;
  name: string;
  ingredients: string;
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  difficulty?: string;
  servings?: number;
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
  is_favorite: boolean;
  times_cooked: number;
  last_cooked?: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id?: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  recipe?: SavedRecipe; // Joined data
}

export interface IngredientSubstitution {
  id: string;
  ingredient_name: string;
  substitute_name: string;
  conversion_ratio: number;
  dietary_tags: string[];
  notes?: string;
}

export interface CalorieLog {
  id: string;
  user_id: string;
  date: string;
  calories: number;
  meal_type?: string;
  recipe_name?: string;
  created_at: string;
}

// ============================================
// AUTH FUNCTIONS
// ============================================

export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================
// PANTRY FUNCTIONS
// ============================================

export const pantryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .order('name');
    return { data, error };
  },

  async create(item: Omit<PantryItem, 'id' | 'user_id' | 'added_date' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('pantry_items')
      .insert([item])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: Partial<PantryItem>) {
    const { data, error } = await supabase
      .from('pantry_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getExpiring() {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('expiry_date');
    return { data, error };
  }
};

// ============================================
// SHOPPING LIST FUNCTIONS
// ============================================

export const shoppingService = {
  async getAll() {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('checked')
      .order('name');
    return { data, error };
  },

  async create(item: Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert([item])
      .select()
      .single();
    return { data, error };
  },

  async createBatch(items: Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert(items)
      .select();
    return { data, error };
  },

  async update(id: string, updates: Partial<ShoppingItem>) {
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);
    return { error };
  },

  async deleteChecked() {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('checked', true);
    return { error };
  }
};

// ============================================
// RECIPES FUNCTIONS
// ============================================

export const recipeService = {
  async getAll() {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getFavorites() {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async create(recipe: Omit<SavedRecipe, 'id' | 'user_id' | 'times_cooked' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('saved_recipes')
      .insert([{ ...recipe, is_favorite: false, times_cooked: 0 }])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: Partial<SavedRecipe>) {
    const { data, error } = await supabase
      .from('saved_recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('id', id);
    return { error };
  },

  async incrementTimesCooked(id: string) {
    const { data, error } = await supabase.rpc('increment_times_cooked', { recipe_id: id });
    return { data, error };
  }
};

// ============================================
// MEAL PLAN FUNCTIONS
// ============================================

export const mealPlanService = {
  async getWeek(startDate: string) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        recipe:saved_recipes(*)
      `)
      .gte('date', startDate)
      .lt('date', endDate.toISOString().split('T')[0])
      .order('date')
      .order('meal_type');
    return { data, error };
  },

  async create(mealPlan: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'recipe'>) {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert([mealPlan])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: Partial<MealPlan>) {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);
    return { error };
  },

  async generateShoppingList(startDate: string) {
    // Get all meal plans for the week with recipes
    const { data: mealPlans, error } = await mealPlanService.getWeek(startDate);
    if (error || !mealPlans) return { data: null, error };

    // Extract all ingredients from recipes
    const ingredients: Map<string, { quantity: number; unit: string; category: string }> = new Map();
    
    mealPlans.forEach((plan: any) => {
      if (plan.recipe) {
        // Parse ingredients from recipe (you'll need to implement proper parsing)
        // This is a simplified version
        const recipeIngredients = plan.recipe.ingredients.split('\n');
        // Aggregate quantities of same ingredients
      }
    });

    return { data: Array.from(ingredients.entries()), error: null };
  }
};

// ============================================
// SUBSTITUTION FUNCTIONS
// ============================================

export const substitutionService = {
  async getSubstitutes(ingredientName: string) {
    const { data, error } = await supabase
      .from('ingredient_substitutions')
      .select('*')
      .ilike('ingredient_name', `%${ingredientName}%`);
    return { data, error };
  },

  async getAllSubstitutions() {
    const { data, error } = await supabase
      .from('ingredient_substitutions')
      .select('*')
      .order('ingredient_name');
    return { data, error };
  }
};

// ============================================
// CALORIE TRACKING FUNCTIONS
// ============================================

export const calorieService = {
  async getTodayCalories() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('calorie_log')
      .select('*')
      .eq('date', today);
    
    const total = data?.reduce((sum, log) => sum + log.calories, 0) || 0;
    return { data: { total, logs: data }, error };
  },

  async logCalories(calories: number, mealType?: string, recipeName?: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('calorie_log')
      .insert([{
        date: today,
        calories,
        meal_type: mealType,
        recipe_name: recipeName
      }])
      .select()
      .single();
    return { data, error };
  },

  async getWeekCalories(startDate: string) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    const { data, error } = await supabase
      .from('calorie_log')
      .select('*')
      .gte('date', startDate)
      .lt('date', endDate.toISOString().split('T')[0])
      .order('date');
    return { data, error };
  }
};