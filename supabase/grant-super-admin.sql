-- ============================================================
-- Grant super_admin to a staff account
--
-- Run AFTER the person has signed up themselves — either at
-- /en/sign-in, or via Supabase dashboard → Authentication → Users →
-- Add user. This file never creates accounts and never handles
-- passwords; it only raises the role of an account that already
-- exists.
--
-- Change the email on the line below before running. It is left as a
-- placeholder on purpose: this file is committed, and a real address
-- in a public repository is an address that gets scraped.
-- ============================================================

do $$
declare
  v_email text := 'you@example.com';
  v_id    uuid;
begin

  select id into v_id from auth.users where lower(email) = lower(v_email);

  if v_id is null then
    raise exception
      'No account exists for %. Sign up first at /en/sign-in, then re-run this.', v_email;
  end if;

  -- The 0001 trigger creates the profile row on signup, but insert it
  -- defensively in case the account was made before that migration ran.
  insert into public.profiles (id, role, is_active)
  values (v_id, 'super_admin', true)
  on conflict (id) do update
    set role = 'super_admin',
        is_active = true;

  raise notice 'super_admin granted to % (%)', v_email, v_id;
end $$;

-- Verify — should return one row showing super_admin / true.
select u.email, p.role, p.is_active
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin';
