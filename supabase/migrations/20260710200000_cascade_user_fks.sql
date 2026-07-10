-- Account deletion integrity (2026-07-10 audit): no user table had a foreign
-- key to auth.users, so DELETE /profile/account relied on a hand-maintained
-- table list that missed donation_history, donation_impact, feedback and
-- error_logs, orphaning that data forever. With ON DELETE CASCADE the final
-- auth.admin.delete_user() call removes every user row atomically, whatever
-- the endpoint's table list says.

-- Remove any rows already orphaned by past account deletions, otherwise the
-- FK constraints cannot be added.
delete from public.profiles where id not in (select id from auth.users);
delete from public.calorie_log where user_id is not null and user_id not in (select id from auth.users);
delete from public.donation_history where user_id is not null and user_id not in (select id from auth.users);
delete from public.donation_impact where user_id is not null and user_id not in (select id from auth.users);
delete from public.feedback where user_id is not null and user_id not in (select id from auth.users);
delete from public.meal_plans where user_id is not null and user_id not in (select id from auth.users);
delete from public.pantry_items where user_id is not null and user_id not in (select id from auth.users);
delete from public.saved_recipes where user_id is not null and user_id not in (select id from auth.users);
delete from public.shopping_items where user_id is not null and user_id not in (select id from auth.users);
-- error_logs: null user_id (pre-login errors) is valid and untouched by the FK
delete from public.error_logs where user_id is not null and user_id not in (select id from auth.users);

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
alter table public.calorie_log
  add constraint calorie_log_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.donation_history
  add constraint donation_history_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.donation_impact
  add constraint donation_impact_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.feedback
  add constraint feedback_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.meal_plans
  add constraint meal_plans_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.pantry_items
  add constraint pantry_items_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.saved_recipes
  add constraint saved_recipes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.shopping_items
  add constraint shopping_items_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.error_logs
  add constraint error_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
