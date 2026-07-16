import { supabase } from './supabase';
import { logError } from './errorService';
import {
  enqueue,
  isNetworkError,
  generateOfflineId,
  getQueue,
  removeEntry,
  ITEM_SYNCED_EVENT,
  type QueueEntry,
  type AddPayload,
  type UpdatePayload,
  type DeletePayload,
} from './offlineQueue';

// ============================================
// PANTRY ITEMS
// ============================================

interface PantryAddInput {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;
}

interface PantryUpdateInput {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiryDate?: string;
  emoji?: string;
}

// Raw Supabase calls, unwrapped by offline handling. Used both by the public
// pantryService below and by drainOfflineQueue() to replay queued entries.
async function pantryAddRemote(item: PantryAddInput) {
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
      emoji: item.emoji || null,
    })
    .select()
    .single();

  if (error) {
    logError(error, 'api:pantry.add');
    throw error;
  }
  return data;
}

async function pantryUpdateRemote(id: string, item: PantryUpdateInput) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiryDate,
      emoji: item.emoji,
    })
    .eq('id', id)
    // maybeSingle, not single: an update that matches 0 rows is not an error to
    // report. .single() raised PGRST116 ("Cannot coerce the result to a single
    // JSON object", 0 rows), which we logged as api:pantry.update — but a
    // 0-row match just means the row is already gone (deleted on another
    // device, or the session lapsed so RLS matches nothing). Treat it as a
    // no-op: return null without logging. Callers apply their edit to local
    // state from their own input and ignore this return value, so the UI still
    // reflects the user's change.
    .select()
    .maybeSingle();

  if (error) {
    logError(error, 'api:pantry.update');
    throw error;
  }
  return data;
}

async function pantryDeleteRemote(id: string) {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export const pantryService = {
  // Get pantry items for current user.
  // Pass { limit, offset } to paginate; omit for the full (legacy) fetch.
  async getAll(opts?: { limit?: number; offset?: number }) {
    let query = supabase
      .from('pantry_items')
      .select('*')
      .order('added_date', { ascending: false });

    if (opts && typeof opts.limit === 'number') {
      const from = opts.offset ?? 0;
      const to = from + opts.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Add a new pantry item. Offline (or genuine network failure): queues the
  // write and returns a synthetic row under a client-generated id so
  // call sites (which build local UI state off the returned row) keep
  // working unmodified — see docs/tasks/11-offline-support.md.
  async add(item: PantryAddInput) {
    try {
      return await pantryAddRemote(item);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const tempId = generateOfflineId();
      enqueue('pantry', 'add', { tempId, item } satisfies AddPayload<PantryAddInput>);
      return {
        id: tempId,
        user_id: null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiryDate || null,
        emoji: item.emoji || null,
        added_date: new Date().toISOString(),
      };
    }
  },

  // Update a pantry item. Offline: queues the write; the call succeeds
  // (doesn't throw) so callers that only apply local state after a
  // successful await still apply it optimistically.
  async update(id: string, item: PantryUpdateInput) {
    try {
      return await pantryUpdateRemote(id, item);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      enqueue('pantry', 'update', { targetId: id, updates: item } satisfies UpdatePayload<PantryUpdateInput>);
      return { id, ...item };
    }
  },

  // Delete a pantry item. Offline: queues the delete instead of throwing.
  async delete(id: string) {
    try {
      await pantryDeleteRemote(id);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      enqueue('pantry', 'delete', { targetId: id } satisfies DeletePayload);
    }
  },
};

// ============================================
// SHOPPING ITEMS
// ============================================

interface ShoppingAddInput {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked?: boolean;
  priority?: string;
}

type ShoppingUpdateInput = Partial<{
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  priority: string;
}>;

async function shoppingAddRemote(item: ShoppingAddInput) {
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

  if (error) {
    logError(error, 'api:shopping.add');
    throw error;
  }
  return data;
}

async function shoppingUpdateRemote(id: string, updates: ShoppingUpdateInput) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(updates)
    .eq('id', id)
    // maybeSingle, not single — same reasoning as pantryUpdateRemote: a 0-row
    // update (row already gone) must not raise PGRST116. Callers ignore the
    // returned row and apply their edit to local state from their own input.
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function shoppingDeleteRemote(id: string) {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export const shoppingService = {
  // Get shopping items for current user.
  // Pass { limit, offset } to paginate; omit for the full (legacy) fetch.
  async getAll(opts?: { limit?: number; offset?: number }) {
    let query = supabase
      .from('shopping_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (opts && typeof opts.limit === 'number') {
      const from = opts.offset ?? 0;
      const to = from + opts.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Add shopping item. Offline: queues the write and returns a synthetic
  // row under a client-generated id (same reasoning as pantryService.add).
  async add(item: ShoppingAddInput) {
    try {
      return await shoppingAddRemote(item);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const tempId = generateOfflineId();
      enqueue('shopping', 'add', { tempId, item } satisfies AddPayload<ShoppingAddInput>);
      return {
        id: tempId,
        user_id: null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked || false,
        priority: item.priority || 'medium',
      };
    }
  },

  // Update shopping item. Offline: queues the write instead of throwing.
  async update(id: string, updates: ShoppingUpdateInput) {
    try {
      return await shoppingUpdateRemote(id, updates);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      enqueue('shopping', 'update', { targetId: id, updates } satisfies UpdatePayload<ShoppingUpdateInput>);
      return { id, ...updates };
    }
  },

  // Delete shopping item. Offline: queues the delete instead of throwing.
  async delete(id: string) {
    try {
      await shoppingDeleteRemote(id);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      enqueue('shopping', 'delete', { targetId: id } satisfies DeletePayload);
    }
  },

  // Delete all checked items
  async deleteChecked() {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('checked', true);

    if (error) throw error;
  },

  // Check or uncheck all items
  async updateAll(checked: boolean) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('shopping_items')
      .update({ checked })
      .eq('user_id', userData.user.id);

    if (error) throw error;
  },
};

// ============================================
// OFFLINE QUEUE DRAIN
// ============================================
// Replays queued pantry/shopping writes against Supabase in order, once the
// browser is back online. Scope: pantry + shopping item add/update/delete
// only (see docs/tasks/11-offline-support.md) — deleteChecked/updateAll and
// recipes/favorites/donation writes are not queued and are unaffected.

export interface DrainOfflineQueueResult {
  /** Number of entries successfully replayed. */
  syncedCount: number;
  /** Number of entries still left in the queue after this run. */
  remaining: number;
  /** True if the drain stopped early because an entry failed (still offline, or a real error). */
  stoppedOnError: boolean;
}

export async function drainOfflineQueue(): Promise<DrainOfflineQueueResult> {
  const queue = getQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, remaining: 0, stoppedOnError: false };
  }

  // A queued update/delete may target an item that was itself added while
  // offline (and hasn't synced yet within this same drain). Track
  // tempId → real-id as 'add' entries resolve so later entries in this pass
  // hit the row Supabase actually created, not the placeholder id.
  const idMap = new Map<string, string>();
  let syncedCount = 0;

  for (const entry of queue) {
    try {
      await replayEntry(entry, idMap);
      removeEntry(entry.id);
      syncedCount++;
    } catch (error) {
      // Genuine failure (still offline, or a real server-side error this
      // time) — stop here and preserve this entry plus everything after it,
      // in order, per the spec ("don't lose data, don't reorder").
      console.error('Offline queue: failed to sync entry, stopping drain', entry, error);
      return { syncedCount, remaining: getQueue().length, stoppedOnError: true };
    }
  }

  return { syncedCount, remaining: 0, stoppedOnError: false };
}

async function replayEntry(entry: QueueEntry, idMap: Map<string, string>): Promise<void> {
  if (entry.entity === 'pantry') {
    if (entry.operation === 'add') {
      const { tempId, item } = entry.payload as AddPayload<PantryAddInput>;
      const row = await pantryAddRemote(item);
      idMap.set(tempId, row.id);
      dispatchItemSynced('pantry', tempId, row.id);
    } else if (entry.operation === 'update') {
      const { targetId, updates } = entry.payload as UpdatePayload<PantryUpdateInput>;
      await pantryUpdateRemote(idMap.get(targetId) ?? targetId, updates);
    } else {
      const { targetId } = entry.payload as DeletePayload;
      await pantryDeleteRemote(idMap.get(targetId) ?? targetId);
    }
  } else {
    if (entry.operation === 'add') {
      const { tempId, item } = entry.payload as AddPayload<ShoppingAddInput>;
      const row = await shoppingAddRemote(item);
      idMap.set(tempId, row.id);
      dispatchItemSynced('shopping', tempId, row.id);
    } else if (entry.operation === 'update') {
      const { targetId, updates } = entry.payload as UpdatePayload<ShoppingUpdateInput>;
      await shoppingUpdateRemote(idMap.get(targetId) ?? targetId, updates);
    } else {
      const { targetId } = entry.payload as DeletePayload;
      await shoppingDeleteRemote(idMap.get(targetId) ?? targetId);
    }
  }
}

function dispatchItemSynced(entity: 'pantry' | 'shopping', tempId: string, realId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ITEM_SYNCED_EVENT, { detail: { entity, tempId, realId } }));
}

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

    if (error) {
      logError(error, 'api:recipes.add');
      throw error;
    }
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

    if (error) {
      logError(error, 'api:mealplans.add');
      throw error;
    }
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
// MEAL PLAN TEMPLATES
// ============================================

// Week-relative entry: dayOfWeek is 0 (Sunday) - 6 (Saturday), matching
// MealPlanCalendar's weekDates ordering, so a template can be replayed
// onto any week regardless of absolute dates.
export interface MealPlanTemplateEntry {
  dayOfWeek: number;
  meal_type: string;
  recipe: any;
  servings: number;
  notes?: string;
}

export interface MealPlanTemplate {
  id: string;
  user_id: string;
  name: string;
  template_data: MealPlanTemplateEntry[];
  created_at: string;
}

// Client-side cap only (see docs/tasks/23-meal-plan-templates.md) — no
// server-side enforcement for v1, a client bypass here is just a UX cap.
export const MEAL_PLAN_TEMPLATE_CAP = 10;

export const mealPlanTemplatesService = {
  // Get all saved templates for the current user, newest first
  async getAll(): Promise<MealPlanTemplate[]> {
    const { data, error } = await supabase
      .from('meal_plan_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add a new template
  async add(template: {
    name: string;
    template_data: MealPlanTemplateEntry[];
  }): Promise<MealPlanTemplate> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('meal_plan_templates')
      .insert({
        user_id: userData.user.id,
        name: template.name,
        template_data: template.template_data,
      })
      .select()
      .single();

    if (error) {
      logError(error, 'api:mealplantemplates.add');
      throw error;
    }
    return data;
  },

  // Delete a template
  async delete(id: string) {
    const { error } = await supabase
      .from('meal_plan_templates')
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
      .maybeSingle();

    if (error) throw error;
    return data || {
      total_donations: 0,
      total_meals: 0,
      total_pounds: 0,
      co2_saved: 0,
    };
  },

  // Update donation impact stats
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
      }, {
        onConflict: 'user_id'  // ← ADD THIS - tells upsert which column is unique
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// ============================================
// ZERO-WASTE STREAKS
// ============================================
//
// Lightweight daily check-in counter — NOT a rigorous historical audit (see
// docs/tasks/24-streaks-badges.md). Reflects "did the user have any
// stale-expired item sitting in their pantry the last time this was
// checked," checked at most once/day client-side — not a server-verified
// guarantee.

export interface UserStreak {
  user_id: string;
  zero_waste_streak_days: number;
  last_checked_date: string | null;
  updated_at: string;
}

export const streakService = {
  // Get the current streak row, upsert-on-read style: falls back to an
  // (unpersisted) default row if the user has never checked in yet —
  // mirrors donationService.getImpact()'s default-row fallback.
  async get(): Promise<UserStreak> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) throw error;
    return data || {
      user_id: userData.user.id,
      zero_waste_streak_days: 0,
      last_checked_date: null,
      updated_at: new Date().toISOString(),
    };
  },

  // Daily check-in. Call at most once per session/day — the caller decides
  // when to call this; the state machine here is:
  //   - last_checked_date is today             -> no-op (already checked in)
  //   - last_checked_date is yesterday
  //       AND !hasStaleExpiredItems             -> streak + 1
  //   - hasStaleExpiredItems                    -> streak reset to 0
  //   - otherwise (gap of >1 day, or first-ever
  //     check-in with no stale items)           -> streak set to 1
  async checkIn(hasStaleExpiredItems: boolean): Promise<UserStreak> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const current = await streakService.get();

    const today = new Date().toISOString().split('T')[0];
    if (current.last_checked_date === today) {
      // Already checked in today — no-op.
      return current;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let nextStreakDays: number;
    if (current.last_checked_date === yesterdayStr && !hasStaleExpiredItems) {
      nextStreakDays = current.zero_waste_streak_days + 1;
    } else if (hasStaleExpiredItems) {
      nextStreakDays = 0;
    } else {
      nextStreakDays = 1;
    }

    const { data, error } = await supabase
      .from('user_streaks')
      .upsert({
        user_id: userData.user.id,
        zero_waste_streak_days: nextStreakDays,
        last_checked_date: today,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// CALORIE TRACKING
// ============================================

export const calorieService = {
  // Get today's total calories
  async getTodayCalories() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('calorie_log')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('date', today);
    
    if (error) throw error;
    
    const total = data?.reduce((sum, log) => sum + log.calories, 0) || 0;
    return { total, logs: data };
  },

  // Log calories (positive for add, negative for subtract)
  async logCalories(calories: number, mealType?: string, recipeName?: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('calorie_log')
      .insert({
        user_id: userData.user.id,
        date: today,
        calories,
        meal_type: mealType,
        recipe_name: recipeName
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get calorie logs for a specific week
  async getWeekCalories(startDate: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    const { data, error } = await supabase
      .from('calorie_log')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('date', startDate)
      .lt('date', endDate.toISOString().split('T')[0])
      .order('date');
    
    if (error) throw error;
    return data || [];
  },

  // Get calorie goal from profile
  async getCalorieGoal() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('daily_calorie_goal')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.daily_calorie_goal || 2000;
  },

  // Update calorie goal in profile
  async updateCalorieGoal(goal: number) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({ daily_calorie_goal: goal })
      .eq('id', userData.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};