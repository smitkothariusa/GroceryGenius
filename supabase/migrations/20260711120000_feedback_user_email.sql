-- Add user_email to feedback, backfill existing rows, and keep it filled on future inserts.
alter table public.feedback
  add column if not exists user_email text;

update public.feedback f
set user_email = u.email
from auth.users u
where f.user_id = u.id
  and f.user_email is null;

create or replace function public.set_feedback_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    select email into new.user_email from auth.users where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_set_user_email on public.feedback;
create trigger feedback_set_user_email
  before insert on public.feedback
  for each row
  execute function public.set_feedback_user_email();
