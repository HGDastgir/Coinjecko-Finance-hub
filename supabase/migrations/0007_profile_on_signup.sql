-- ============================================================
-- 0007 — Create a profile row when an account is created
--
-- 0001 defined public.profiles as 1:1 with auth.users but never wired
-- up the trigger that keeps them in step. The consequence only shows
-- at first use: someone signs up, no profile row exists, and
-- getCurrentUser() reads is_active as false — so the account is
-- created successfully and then behaves exactly like a banned one,
-- redirected away from /admin with no way to tell why.
--
-- The new profile deliberately gets role = NULL. is_active defaults to
-- true, but with no role has_permission() returns false for
-- everything, so a fresh account can sign in and do nothing until
-- somebody with roles.assign grants it a role. That is the
-- least-privilege default the security model already assumes.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Keeps public.profiles 1:1 with auth.users. New profiles carry no role.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
insert into public.profiles (id, display_name)
select u.id, split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
