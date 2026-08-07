-- ============================================================
-- 0005 — Contact form submissions
--
-- Anyone may submit; only staff holding users.manage may read. The
-- table is deliberately write-only from the public's side: a policy
-- that let submitters read rows back would expose every other
-- visitor's message and email address.
-- ============================================================

create type public.contact_topic as enum
  ('general', 'advertising', 'correction', 'data_request');

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  topic      public.contact_topic not null default 'general',
  name       text not null check (length(trim(name)) between 1 and 120),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message    text not null check (length(trim(message)) between 1 and 5000),
  -- Coarse abuse-tracing context. No cookies, no fingerprinting.
  ip         inet,
  user_agent text,
  handled_at timestamptz,
  handled_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index contact_messages_created_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Submissions arrive through a server action using the service role,
-- so no INSERT policy is granted to anon/authenticated: there is no
-- public write path to abuse directly.
create policy "contact: staff read with users.manage"
  on public.contact_messages for select
  to authenticated
  using (public.has_permission('users.manage'));

create policy "contact: staff mark handled"
  on public.contact_messages for update
  to authenticated
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- Row changes are audited like other content tables.
create trigger trg_audit_contact_messages
  after insert or update or delete on public.contact_messages
  for each row execute function public.log_row_change();
