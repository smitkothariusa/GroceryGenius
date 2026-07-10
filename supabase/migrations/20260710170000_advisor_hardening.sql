-- Resolves the remaining Supabase advisor findings (2026-07-10 triage):
--   * security_definer_view (ERROR x2)
--   * anon/authenticated_security_definer_function_executable, function_search_path_mutable
--   * multiple_permissive_policies (x102) + auth_rls_initplan (x38)
--   * duplicate_index on meal_plans

-- ============================================================
-- 1. Views: enforce the QUERYING user's RLS, not the creator's.
-- Both views read RLS-protected user tables with no user filter of their
-- own — as SECURITY DEFINER they exposed every user's rows via the API.
-- ============================================================
alter view public.expiring_items set (security_invoker = true);
alter view public.weekly_meal_summary set (security_invoker = true);

-- ============================================================
-- 2. Functions: pin search_path; remove RPC exposure of the
-- signup trigger. Trigger firing does not require EXECUTE at
-- call time, so revoking only removes /rest/v1/rpc access.
-- ============================================================
alter function public.handle_new_user() set search_path = '';
alter function public.update_updated_at_column() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- 3. RLS policies: one permissive policy per command per table,
-- scoped to authenticated, with auth.uid() wrapped in a subselect
-- so it is evaluated once per query instead of once per row.
-- Semantics are unchanged: anon matched no rows before (auth.uid()
-- is null) and matches no policy now.
-- ============================================================

-- calorie_log (had duplicate SELECT + INSERT policy pairs)
drop policy "Users can view own calorie log" on public.calorie_log;
drop policy "Users can view own calorie logs" on public.calorie_log;
drop policy "Users can insert own calorie log" on public.calorie_log;
drop policy "Users can insert own calorie logs" on public.calorie_log;
drop policy "Users can update own calorie logs" on public.calorie_log;
drop policy "Users can delete own calorie logs" on public.calorie_log;

create policy "Users can view own calorie logs" on public.calorie_log
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own calorie logs" on public.calorie_log
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own calorie logs" on public.calorie_log
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own calorie logs" on public.calorie_log
  for delete to authenticated using ((select auth.uid()) = user_id);

-- donation_history (had duplicate SELECT + INSERT policy pairs)
drop policy "Users can view own donation history" on public.donation_history;
drop policy "Users can view own donations" on public.donation_history;
drop policy "Users can insert donations" on public.donation_history;
drop policy "Users can insert own donation history" on public.donation_history;
drop policy "Users can update own donation history" on public.donation_history;
drop policy "Users can delete own donation history" on public.donation_history;

create policy "Users can view own donation history" on public.donation_history
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own donation history" on public.donation_history
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own donation history" on public.donation_history
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own donation history" on public.donation_history
  for delete to authenticated using ((select auth.uid()) = user_id);

-- donation_impact (ALL policy overlapped a separate DELETE policy)
drop policy "Users can manage own impact" on public.donation_impact;
drop policy "Users can delete own impact" on public.donation_impact;

create policy "Users can view own impact" on public.donation_impact
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own impact" on public.donation_impact
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own impact" on public.donation_impact
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own impact" on public.donation_impact
  for delete to authenticated using ((select auth.uid()) = user_id);

-- feedback (initplan only)
drop policy "Users can submit feedback" on public.feedback;
create policy "Users can submit feedback" on public.feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- meal_plans (initplan only)
drop policy "Users can view own meal plans" on public.meal_plans;
drop policy "Users can insert own meal plans" on public.meal_plans;
drop policy "Users can update own meal plans" on public.meal_plans;
drop policy "Users can delete own meal plans" on public.meal_plans;

create policy "Users can view own meal plans" on public.meal_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own meal plans" on public.meal_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own meal plans" on public.meal_plans
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own meal plans" on public.meal_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- pantry_items (ALL policy overlapped per-command policies)
drop policy "Users can manage own pantry" on public.pantry_items;
drop policy "Users can view own pantry" on public.pantry_items;
drop policy "Users can insert own pantry items" on public.pantry_items;
drop policy "Users can update own pantry items" on public.pantry_items;
drop policy "Users can delete own pantry items" on public.pantry_items;

create policy "Users can view own pantry items" on public.pantry_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own pantry items" on public.pantry_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own pantry items" on public.pantry_items
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own pantry items" on public.pantry_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- profiles (initplan only; keyed on id, no DELETE policy by design)
drop policy "Users can view own profile" on public.profiles;
drop policy "Users can insert own profile" on public.profiles;
drop policy "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- saved_recipes (ALL policy overlapped per-command policies)
drop policy "Users can manage own recipes" on public.saved_recipes;
drop policy "Users can view own recipes" on public.saved_recipes;
drop policy "Users can insert own recipes" on public.saved_recipes;
drop policy "Users can update own recipes" on public.saved_recipes;
drop policy "Users can delete own recipes" on public.saved_recipes;

create policy "Users can view own recipes" on public.saved_recipes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own recipes" on public.saved_recipes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own recipes" on public.saved_recipes
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own recipes" on public.saved_recipes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- shopping_items (ALL policy + duplicate SELECT policies)
drop policy "Users can manage own shopping" on public.shopping_items;
drop policy "Users can view own shopping" on public.shopping_items;
drop policy "Users can view own shopping items" on public.shopping_items;
drop policy "Users can insert own shopping items" on public.shopping_items;
drop policy "Users can update own shopping items" on public.shopping_items;
drop policy "Users can delete own shopping items" on public.shopping_items;

create policy "Users can view own shopping items" on public.shopping_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own shopping items" on public.shopping_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own shopping items" on public.shopping_items
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own shopping items" on public.shopping_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- error_logs "Anyone can log errors" (WITH CHECK true) is intentionally left
-- as-is: pre-login clients must be able to report errors.

-- ============================================================
-- 4. Duplicate index: idx_meal_plans_user and meal_plans_user_id_idx
-- are both btree(user_id); keep the conventionally named one.
-- ============================================================
drop index if exists public.idx_meal_plans_user;
