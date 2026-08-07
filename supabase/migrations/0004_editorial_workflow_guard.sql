-- ============================================================
-- 0004 — Editorial workflow guard
--
-- 0002's "articles: edit own or any" UPDATE policy gates *who* may
-- edit a row, but not *which* status they may move it to. An author
-- (content.edit_own, no content.publish) could therefore set
-- status = 'published' on their own draft and reach the public site,
-- because the public read policy keys off status alone.
--
-- RLS cannot express this on its own: WITH CHECK sees only NEW, so it
-- cannot compare against the previous status. A BEFORE UPDATE trigger
-- can, so the transition rules live here — making the database the
-- enforcement boundary the security model claims it is, rather than
-- relying on the TypeScript mirror in src/lib/content/workflow.ts.
-- ============================================================

create or replace function public.enforce_editorial_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No JWT claims = service-role, migration or seed context. Those are
  -- already trusted (mirrors prevent_privilege_escalation in 0001).
  if current_setting('request.jwt.claims', true) is null then
    return new;
  end if;

  if new.status is distinct from old.status then

    -- Entering or leaving 'published' changes public visibility.
    if new.status = 'published' or old.status = 'published' then
      if not public.has_permission('content.publish') then
        raise exception
          'changing publication state requires the content.publish permission';
      end if;

    -- Clearing an article for publication is the reviewer's gate.
    elsif new.status = 'approved' then
      if not public.has_permission('content.review') then
        raise exception
          'approving content requires the content.review permission';
      end if;
    end if;

    -- Only the transitions the editorial workflow actually defines.
    if not (
         (old.status = 'draft'     and new.status in ('review', 'published', 'archived'))
      or (old.status = 'review'    and new.status in ('draft', 'approved', 'archived'))
      or (old.status = 'approved'  and new.status in ('review', 'published', 'archived'))
      or (old.status = 'published' and new.status in ('draft', 'archived'))
      or (old.status = 'archived'  and new.status = 'draft')
    ) then
      raise exception 'illegal editorial transition: % -> %', old.status, new.status;
    end if;

    -- Keep published_needs_timestamp satisfied without trusting the
    -- caller to send a timestamp (and never backdate an existing one).
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;

    -- Record who moved it out of review, for the audit trail.
    if new.status in ('approved', 'published') and new.reviewed_by is null then
      new.reviewed_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_editorial_workflow() is
  'Enforces content_status transition rules and their required permissions on public.articles.';

create trigger trg_articles_workflow_guard
  before update on public.articles
  for each row execute function public.enforce_editorial_workflow();

-- Inserts bypass the trigger above, so an author could otherwise create
-- a row already marked 'published'. 0002's insert policy only checks
-- content.create; tighten it to require content.publish for anything
-- that is born public.
drop policy if exists "articles: create with content.create" on public.articles;

create policy "articles: create with content.create"
  on public.articles for insert
  to authenticated
  with check (
    public.has_permission('content.create')
    and created_by = auth.uid()
    and (
      status in ('draft', 'review')
      or (status = 'approved'  and public.has_permission('content.review'))
      or (status = 'published' and public.has_permission('content.publish'))
    )
  );
