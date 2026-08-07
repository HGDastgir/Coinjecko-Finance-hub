-- ============================================================
-- 0001 — Identity, RBAC and tamper-resistant audit trail
-- Apply with the Supabase CLI (supabase db push) or SQL editor.
-- Design: least privilege, RLS on every table, append-only audit.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
create type public.app_role as enum (
  'super_admin',
  'security_admin',
  'editor',
  'author',
  'market_data_manager',
  'video_manager',
  'advertising_manager',
  'newsletter_manager',
  'analyst'
);

-- Permission matrix (mirrored in src/lib/auth/permissions.ts).
create table public.role_permissions (
  role       public.app_role not null,
  permission text            not null,
  primary key (role, permission)
);

-- ------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role         public.app_role,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path)
-- ------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and is_active
$$;

create or replace function public.has_permission(required text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    where rp.role = public.current_app_role()
      and rp.permission = required
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'super_admin'
$$;

-- ------------------------------------------------------------
-- Profiles RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: user managers read all"
  on public.profiles for select
  using (public.has_permission('users.manage'));

create policy "profiles: update own non-privileged fields"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Role changes and activation are service-role/API-only; a trigger
-- blocks privilege escalation through self-service updates.
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.has_permission('roles.assign')
     and current_setting('request.jwt.claims', true) is not null then
    raise exception 'changing role or activation requires roles.assign permission';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_privilege_guard
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- role_permissions: readable by any authenticated staff member,
-- writable only via service role (no policies grant write).
alter table public.role_permissions enable row level security;

create policy "role_permissions: authenticated read"
  on public.role_permissions for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- Audit log — append-only, tamper-resistant
-- ------------------------------------------------------------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  metadata   jsonb not null default '{}'::jsonb,
  ip         inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit: readable with audit.read"
  on public.audit_log for select
  using (public.has_permission('audit.read'));

-- No insert/update/delete policies: only the service role writes.
-- Belt-and-braces: block UPDATE/DELETE even for privileged roles.
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger trg_audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

revoke update, delete on public.audit_log from anon, authenticated;

-- ------------------------------------------------------------
-- Login events (anomaly detection source)
-- ------------------------------------------------------------
create table public.login_events (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  email_hash text,          -- sha256 of email; raw email is never stored here
  success    boolean not null,
  ip         inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.login_events enable row level security;

create policy "login_events: readable with audit.read"
  on public.login_events for select
  using (public.has_permission('audit.read'));

create trigger trg_login_events_no_update
  before update or delete on public.login_events
  for each row execute function public.audit_log_immutable();

revoke update, delete on public.login_events from anon, authenticated;

-- ------------------------------------------------------------
-- Generic row-change audit trigger for content tables
-- (attached per-table in later migrations)
-- ------------------------------------------------------------
create or replace function public.log_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(
      case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')
           else (to_jsonb(new) ->> 'id') end,
      ''
    ),
    jsonb_build_object('op', tg_op)
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- updated_at convenience trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Seed the permission matrix (idempotent)
-- ------------------------------------------------------------
insert into public.role_permissions (role, permission) values
  -- super_admin: everything
  ('super_admin', 'content.create'), ('super_admin', 'content.edit_own'),
  ('super_admin', 'content.edit_any'), ('super_admin', 'content.review'),
  ('super_admin', 'content.publish'), ('super_admin', 'content.delete'),
  ('super_admin', 'taxonomy.manage'), ('super_admin', 'media.upload'),
  ('super_admin', 'media.manage_video'), ('super_admin', 'media.manage_podcast'),
  ('super_admin', 'market_data.manage'), ('super_admin', 'market_data.configure_providers'),
  ('super_admin', 'ads.manage'), ('super_admin', 'newsletter.manage'),
  ('super_admin', 'users.manage'), ('super_admin', 'roles.assign'),
  ('super_admin', 'audit.read'), ('super_admin', 'security.configure'),
  -- security_admin
  ('security_admin', 'audit.read'), ('security_admin', 'security.configure'),
  ('security_admin', 'users.manage'), ('security_admin', 'roles.assign'),
  -- editor
  ('editor', 'content.create'), ('editor', 'content.edit_own'),
  ('editor', 'content.edit_any'), ('editor', 'content.review'),
  ('editor', 'content.publish'), ('editor', 'content.delete'),
  ('editor', 'taxonomy.manage'), ('editor', 'media.upload'),
  -- author
  ('author', 'content.create'), ('author', 'content.edit_own'),
  ('author', 'media.upload'),
  -- market_data_manager
  ('market_data_manager', 'market_data.manage'),
  ('market_data_manager', 'market_data.configure_providers'),
  -- video_manager
  ('video_manager', 'media.upload'), ('video_manager', 'media.manage_video'),
  -- advertising_manager
  ('advertising_manager', 'ads.manage'),
  -- newsletter_manager
  ('newsletter_manager', 'newsletter.manage'),
  -- analyst
  ('analyst', 'content.create'), ('analyst', 'content.edit_own')
on conflict do nothing;
