-- ingredient_substitutions is global reference data: the app only reads it
-- (substitutionService in frontend/src/lib/supabase.ts). Enable RLS with a
-- read-only policy; writes stay restricted to the service role.
alter table public.ingredient_substitutions enable row level security;

create policy "Anyone can read substitutions"
  on public.ingredient_substitutions
  for select
  to anon, authenticated
  using (true);
