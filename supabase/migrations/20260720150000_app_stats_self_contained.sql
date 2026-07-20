-- Make app_stats a single, directly-readable table of all-time impact figures
-- (per user request: "only a table, nothing more" — read it with a plain
-- SELECT, no read function). Donations are stored as columns and kept in sync
-- from the existing per-user donation_impact by a trigger, so they include all
-- past data and stay current. recipes_generated keeps being bumped by the
-- backend (increment_recipes_generated); its history only goes back to when
-- tracking started (2026-07-18) since generations were never recorded before.

alter table public.app_stats
  add column if not exists total_donations bigint  not null default 0,
  add column if not exists meals_provided  numeric  not null default 0,
  add column if not exists pounds_donated  numeric  not null default 0,
  add column if not exists co2_saved_kg    numeric  not null default 0;

-- Recompute the donation columns from every per-user donation_impact row.
-- SECURITY DEFINER so it can both read donation_impact (per-user RLS) and write
-- app_stats (no public write policy).
create or replace function public.refresh_app_stats_donations()
returns void
language sql
security definer
set search_path = public
as $$
  update public.app_stats set
    total_donations = coalesce((select sum(total_donations) from public.donation_impact), 0),
    meals_provided  = coalesce((select sum(total_meals)     from public.donation_impact), 0),
    pounds_donated  = coalesce((select sum(total_pounds)    from public.donation_impact), 0),
    co2_saved_kg    = coalesce((select sum(co2_saved)       from public.donation_impact), 0),
    updated_at = now()
  where id = 1;
$$;

-- Backfill now with all-time past donations.
select public.refresh_app_stats_donations();

-- Keep the donation columns fresh: any change to donation_impact re-syncs them.
-- Statement-level so it runs once per statement regardless of rows touched.
create or replace function public.trg_refresh_app_stats_donations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_app_stats_donations();
  return null;
end;
$$;

drop trigger if exists app_stats_donation_sync on public.donation_impact;
create trigger app_stats_donation_sync
  after insert or update or delete on public.donation_impact
  for each statement execute function public.trg_refresh_app_stats_donations();

-- No longer needed: app_stats is a plain table read directly now.
drop function if exists public.get_global_impact();
