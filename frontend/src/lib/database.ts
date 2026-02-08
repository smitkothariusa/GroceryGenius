import { supabase } from './supabase';

// ============================================
// PANTRY ITEMS
// ============================================

export const pantryService = {
  // Get all pantry items for current user
  async getAll() {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .order('added_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Add a new pantry item
  async add(item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    expiryDate?: string;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pantry_items')
      .insert({
        user_id: userData.user.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiryDate || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update a pantry item
  async update(id: string, item: {
    name?: string;
    quantity?: number;
    unit?: string;
    category?: string;
    expiryDate?: string;
  }) {
    const { data, error } = await supabase
      .from('pantry_items')
      .update({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiryDate,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete a pantry item
  async delete(id: string) {
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================
// SHOPPING ITEMS
// ============================================

export const shoppingService = {
  // Get all shopping items
  async getAll() {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Add shopping item
  async add(item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    checked?: boolean;
    priority?: string;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        user_id: userData.user.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked || false,
        priority: item.priority || 'medium',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update shopping item
  async update(id: string, updates: Partial<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    checked: boolean;
    priority: string;
  }>) {
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete shopping item
  async delete(id: string) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Delete all checked items
  async deleteChecked() {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('checked', true);
    
    if (error) throw error;
  },
};

// ============================================
// SAVED RECIPES (FAVORITES)
// ============================================

export const recipesService = {
  // Get all saved recipes
  async getAll() {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Add recipe to favorites
  async add(recipe: {
    name: string;
    ingredients: string;
    instructions: string;
    prep_time?: string;
    cook_time?: string;
    difficulty?: string;
    servings?: number;
    nutrition?: any;
    health_benefits?: string;
    budget_tip?: string;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert({
        user_id: userData.user.id,
        ...recipe,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete recipe
  async delete(id: string) {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================
// MEAL PLANS
// ============================================

export const mealPlansService = {
  // Get all meal plans
  async getAll() {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Add meal plan
    // Add meal plan
    async add(mealPlan: {
    date: string;
    meal_type: string;
    recipe: any;
    servings: number;
    notes?: string;
    completed?: boolean;
    }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Serialize the recipe object as JSONB
    const recipeToStore = mealPlan.recipe ? {
        id: mealPlan.recipe.id,
        name: mealPlan.recipe.name,
        ingredients: mealPlan.recipe.ingredients,
        instructions: mealPlan.recipe.instructions,
        prep_time: mealPlan.recipe.prep_time,
        servings: mealPlan.recipe.servings,
        nutrition: mealPlan.recipe.nutrition
    } : null;

    const { data, error } = await supabase
        .from('meal_plans')
        .insert({
        user_id: userData.user.id,
        date: mealPlan.date,
        meal_type: mealPlan.meal_type,
        recipe: recipeToStore,  // Store as JSONB
        servings: mealPlan.servings,
        notes: mealPlan.notes,
        completed: mealPlan.completed || false
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
    },

  // Update meal plan
  async update(id: string, updates: Partial<{
    servings: number;
    notes: string;
    completed: boolean;
  }>) {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete meal plan
  async delete(id: string) {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================
// DONATION HISTORY
// ============================================

export const donationService = {
  // Get donation history
  async getHistory() {
    const { data, error } = await supabase
      .from('donation_history')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Add donation record
  async add(donation: {
    date: string;
    food_bank: string;
    items: any;
    total_meals: number;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('donation_history')
      .insert({
        user_id: userData.user.id,
        ...donation,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get donation impact stats
  async getImpact() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('donation_impact')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || {
      total_donations: 0,
      total_meals: 0,
      total_pounds: 0,
      co2_saved: 0,
    };
  },

  // Update donation impact stats
  async updateImpact(impact: {
    total_donations: number;
    total_meals: number;
    total_pounds: number;
    co2_saved: number;
    last_donation?: string;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('donation_impact')
      .upsert({
        user_id: userData.user.id,
        ...impact,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};