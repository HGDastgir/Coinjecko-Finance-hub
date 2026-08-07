-- ============================================================
-- 0002 — Editorial content system
-- Bilingual articles (per-locale translations), editorial
-- workflow, media, comments, newsletter, advertising.
-- Public reads only published content; writes require permissions.
-- ============================================================

create type public.content_status as enum
  ('draft', 'review', 'approved', 'published', 'archived');

create type public.article_type as enum
  ('breaking_news', 'market_update', 'explainer', 'analysis',
   'opinion', 'interview', 'sponsored');

create type public.locale_code as enum ('en', 'ur');

-- ------------------------------------------------------------
-- Authors (public editorial identity; distinct from login users)
-- ------------------------------------------------------------
create table public.authors (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) on delete set null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  title       text,
  bio         text,
  expertise   text[],
  avatar_path text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Taxonomy
-- ------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  parent_id  uuid references public.categories (id) on delete set null,
  name_en    text not null,
  name_ur    text,
  created_at timestamptz not null default now()
);

create table public.tags (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ur text
);

-- ------------------------------------------------------------
-- Articles: locale-neutral base + per-locale translations
-- ------------------------------------------------------------
create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  article_type  public.article_type not null default 'market_update',
  status        public.content_status not null default 'draft',
  author_id     uuid references public.authors (id),
  category_id   uuid references public.categories (id),
  created_by    uuid not null references public.profiles (id),
  reviewed_by   uuid references public.profiles (id),
  is_sponsored  boolean not null default false,
  sponsor_name  text,
  hero_image_path text,
  published_at  timestamptz,
  scheduled_for timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- sponsored content must always carry a sponsor label
  constraint sponsored_needs_sponsor
    check (not is_sponsored or sponsor_name is not null),
  constraint published_needs_timestamp
    check (status <> 'published' or published_at is not null)
);

create table public.article_translations (
  id               uuid primary key default gen_random_uuid(),
  article_id       uuid not null references public.articles (id) on delete cascade,
  locale           public.locale_code not null,
  slug             text not null check (slug ~ '^[a-z0-9-]+$'),
  title            text not null,
  excerpt          text,
  body             text not null default '',
  seo_title        text,
  seo_description  text,
  sources          jsonb not null default '[]'::jsonb, -- [{name,url}]
  correction_notes jsonb not null default '[]'::jsonb, -- [{date,note}]
  is_machine_translated boolean not null default false,
  reviewed_translation  boolean not null default false,
  unique (article_id, locale),
  unique (locale, slug)
);

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

-- ------------------------------------------------------------
-- Media
-- ------------------------------------------------------------
create table public.videos (
  id           uuid primary key default gen_random_uuid(),
  status       public.content_status not null default 'draft',
  locale       public.locale_code not null default 'en',
  title        text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description  text,
  provider     text,             -- e.g. 'youtube' | 'self_hosted'
  provider_ref text,             -- external id; validated server-side
  is_short     boolean not null default false,
  duration_s   integer check (duration_s is null or duration_s >= 0),
  created_by   uuid not null references public.profiles (id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.podcasts (
  id           uuid primary key default gen_random_uuid(),
  status       public.content_status not null default 'draft',
  locale       public.locale_code not null default 'en',
  title        text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description  text,
  audio_path   text,
  episode_no   integer,
  duration_s   integer check (duration_s is null or duration_s >= 0),
  created_by   uuid not null references public.profiles (id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Comments (pre-moderated)
-- ------------------------------------------------------------
create type public.comment_status as enum ('pending', 'approved', 'rejected');

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  status     public.comment_status not null default 'pending',
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Newsletter (minimum data, explicit consent, double opt-in)
-- ------------------------------------------------------------
create table public.newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  locale            public.locale_code not null default 'en',
  consent_given_at  timestamptz not null default now(),
  consent_source    text,                    -- which form/page
  confirmed_at      timestamptz,             -- double opt-in confirmation
  confirm_token     uuid not null default gen_random_uuid(),
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Advertising (always labelled; see Advertising Disclosure page)
-- ------------------------------------------------------------
create table public.advertisements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in
                ('adsense', 'direct', 'sponsored_article', 'affiliate',
                 'newsletter_sponsor', 'podcast_sponsor')),
  placement   text not null,
  target_url  text,
  image_path  text,
  label       text not null default 'Advertisement',
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default false,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row-Level Security
-- ------------------------------------------------------------
alter table public.authors               enable row level security;
alter table public.categories            enable row level security;
alter table public.tags                  enable row level security;
alter table public.articles              enable row level security;
alter table public.article_translations  enable row level security;
alter table public.article_tags          enable row level security;
alter table public.videos                enable row level security;
alter table public.podcasts              enable row level security;
alter table public.comments              enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.advertisements        enable row level security;

-- Public (anon) read access: published editorial surfaces only.
create policy "authors: public read active"
  on public.authors for select using (is_active);

create policy "categories: public read"
  on public.categories for select using (true);

create policy "tags: public read"
  on public.tags for select using (true);

create policy "articles: public read published"
  on public.articles for select
  using (status = 'published' or public.has_permission('content.review'));

create policy "translations: public read for published articles"
  on public.article_translations for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (a.status = 'published' or public.has_permission('content.review'))
    )
  );

create policy "article_tags: public read"
  on public.article_tags for select using (true);

create policy "videos: public read published"
  on public.videos for select
  using (status = 'published' or public.has_permission('content.review'));

create policy "podcasts: public read published"
  on public.podcasts for select
  using (status = 'published' or public.has_permission('content.review'));

create policy "comments: public read approved"
  on public.comments for select
  using (status = 'approved' or public.has_permission('content.review'));

create policy "comments: signed-in users create pending"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- newsletter_subscribers: NO public policies. Subscription flows run
-- through server routes with the service role; subscriber data is
-- readable only with newsletter.manage.
create policy "newsletter: managers read"
  on public.newsletter_subscribers for select
  using (public.has_permission('newsletter.manage'));

create policy "ads: public read active"
  on public.advertisements for select
  using (is_active or public.has_permission('ads.manage'));

-- Staff write access (permission-gated).
create policy "articles: create with content.create"
  on public.articles for insert
  to authenticated
  with check (public.has_permission('content.create') and created_by = auth.uid());

create policy "articles: edit own or any"
  on public.articles for update
  to authenticated
  using (
    (public.has_permission('content.edit_own') and created_by = auth.uid())
    or public.has_permission('content.edit_any')
  )
  with check (
    (public.has_permission('content.edit_own') and created_by = auth.uid())
    or public.has_permission('content.edit_any')
  );

create policy "articles: delete with content.delete"
  on public.articles for delete
  to authenticated
  using (public.has_permission('content.delete'));

create policy "translations: write follows article edit rights"
  on public.article_translations for all
  to authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and ((public.has_permission('content.edit_own') and a.created_by = auth.uid())
             or public.has_permission('content.edit_any'))
    )
  )
  with check (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and ((public.has_permission('content.edit_own') and a.created_by = auth.uid())
             or public.has_permission('content.edit_any'))
    )
  );

create policy "article_tags: write follows taxonomy or edit rights"
  on public.article_tags for all
  to authenticated
  using (public.has_permission('content.edit_any') or public.has_permission('taxonomy.manage'))
  with check (public.has_permission('content.edit_any') or public.has_permission('taxonomy.manage'));

create policy "categories: manage with taxonomy.manage"
  on public.categories for all
  to authenticated
  using (public.has_permission('taxonomy.manage'))
  with check (public.has_permission('taxonomy.manage'));

create policy "tags: manage with taxonomy.manage"
  on public.tags for all
  to authenticated
  using (public.has_permission('taxonomy.manage'))
  with check (public.has_permission('taxonomy.manage'));

create policy "authors: manage with users.manage or editor rights"
  on public.authors for all
  to authenticated
  using (public.has_permission('content.edit_any') or public.has_permission('users.manage'))
  with check (public.has_permission('content.edit_any') or public.has_permission('users.manage'));

create policy "videos: manage with media.manage_video"
  on public.videos for all
  to authenticated
  using (public.has_permission('media.manage_video'))
  with check (public.has_permission('media.manage_video') and created_by = auth.uid());

create policy "podcasts: manage with media.manage_podcast"
  on public.podcasts for all
  to authenticated
  using (public.has_permission('media.manage_podcast'))
  with check (public.has_permission('media.manage_podcast') and created_by = auth.uid());

create policy "comments: moderate with content.review"
  on public.comments for update
  to authenticated
  using (public.has_permission('content.review'))
  with check (public.has_permission('content.review'));

create policy "ads: manage with ads.manage"
  on public.advertisements for all
  to authenticated
  using (public.has_permission('ads.manage'))
  with check (public.has_permission('ads.manage') and created_by = auth.uid());

-- ------------------------------------------------------------
-- updated_at + audit triggers
-- ------------------------------------------------------------
create trigger trg_authors_updated  before update on public.authors
  for each row execute function public.set_updated_at();
create trigger trg_articles_updated before update on public.articles
  for each row execute function public.set_updated_at();
create trigger trg_videos_updated   before update on public.videos
  for each row execute function public.set_updated_at();
create trigger trg_podcasts_updated before update on public.podcasts
  for each row execute function public.set_updated_at();
create trigger trg_ads_updated      before update on public.advertisements
  for each row execute function public.set_updated_at();

create trigger trg_audit_articles
  after insert or update or delete on public.articles
  for each row execute function public.log_row_change();
create trigger trg_audit_translations
  after insert or update or delete on public.article_translations
  for each row execute function public.log_row_change();
create trigger trg_audit_ads
  after insert or update or delete on public.advertisements
  for each row execute function public.log_row_change();
create trigger trg_audit_videos
  after insert or update or delete on public.videos
  for each row execute function public.log_row_change();
create trigger trg_audit_podcasts
  after insert or update or delete on public.podcasts
  for each row execute function public.log_row_change();

-- ------------------------------------------------------------
-- Useful indexes
-- ------------------------------------------------------------
create index idx_articles_status_published_at
  on public.articles (status, published_at desc);
create index idx_articles_category on public.articles (category_id);
create index idx_translations_locale_slug
  on public.article_translations (locale, slug);
create index idx_comments_article on public.comments (article_id, status);
