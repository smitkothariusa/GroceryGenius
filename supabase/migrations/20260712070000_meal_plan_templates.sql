create table if not exists public.meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  template_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meal_plan_templates enable row level security;

create policy "Users can manage their own meal plan templates"
  on public.meal_plan_templates
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
