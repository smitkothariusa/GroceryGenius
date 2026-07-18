-- App-wide impact stats: a single-row table of global figures for
-- GroceryGenius as a whole. No user_ids, no per-event timestamps — just
-- aggregate counters.
--
-- recipes_generated is a counter bumped server-side by the backend after each
-- successful recipe generation (behind auth + rate limits), so clients cannot
-- inflate it. Donation figures are NOT duplicated here — they are summed live
-- from the existing per-user donation_impact table via get_global_impact(),
-- so they are always authoritative.

create table if not exists public.app_stats (
  id                smallint primary key default 1 check (id = 1),
  recipes_generated bigint not null default 0,
  updated_at        timestamptz not null default now()
);

-- Exactly one row, id = 1.
insert into public.app_stats (id) values (1) on conflict (id) do nothing;

alter table public.app_stats enable row level security;

-- The aggregate row holds no personal data; public read is fine.
drop policy if exists "app_stats public read" on public.app_stats;
create policy "app_stats public read" on public.app_stats
  for select using (true);

-- Atomic increment of the recipe counter. SECURITY DEFINER so it can write
-- despite RLS; EXECUTE is restricted to service_role, so ONLY the backend
-- (which holds the service key) can call it — no client can inflate the number.
create or replace function public.increment_recipes_generated(n bigint default 1)
returns void
language sql
security definer
set search_path = public
as $$
  update public.app_stats
     set recipes_generated = recipes_generated + n,
         updated_at = now()
   where id = 1;
$$;

revoke all on function public.increment_recipes_generated(bigint) from public, anon, authenticated;
grant execute on function public.increment_recipes_generated(bigint) to service_role;

-- Global impact read: the recipes counter plus live donation sums. SECURITY
-- DEFINER so it can aggregate donation_impact across all users, but it returns
-- ONLY totals — no per-user rows are exposed.
create or replace function public.get_global_impact()
returns table (
  recipes_generated bigint,
  total_donations   bigint,
  meals_provided    numeric,
  pounds_donated    numeric,
  co2_saved_kg      numeric,
  updated_at        timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.recipes_generated,
    coalesce((select sum(total_donations) from public.donation_impact), 0)::bigint,
    coalesce((select sum(total_meals)     from public.donation_impact), 0)::numeric,
    coalesce((select sum(total_pounds)    from public.donation_impact), 0)::numeric,
    coalesce((select sum(co2_saved)       from public.donation_impact), 0)::numeric,
    s.updated_at
  from public.app_stats s
  where s.id = 1;
$$;

grant execute on function public.get_global_impact() to anon, authenticated;
