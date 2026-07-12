create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zero_waste_streak_days integer not null default 0,
  last_checked_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "Users can manage their own streak"
  on public.user_streaks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
