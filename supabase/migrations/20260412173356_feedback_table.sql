create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug', 'suggestion', 'complaint', 'compliment')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Authenticated users can insert their own feedback
create policy "Users can submit feedback"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No SELECT policy — only readable via service role (admin dashboard)
