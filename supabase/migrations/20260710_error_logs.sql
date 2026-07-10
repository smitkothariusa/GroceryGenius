create table if not exists public.error_logs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete set null,
  error_message text        not null,
  stack_trace   text,
  context       text        not null,
  url           text,
  created_at    timestamptz not null default now()
);

alter table public.error_logs enable row level security;

-- Allow both anonymous and authenticated users to insert error logs.
-- user_id may be null for unauthenticated sessions.
create policy "Anyone can log errors"
  on public.error_logs
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT/UPDATE/DELETE policies — only readable via service role (Supabase dashboard).
