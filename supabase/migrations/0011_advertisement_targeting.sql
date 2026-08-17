-- ============================================================
-- 0011  Advertisement targeting and integrity
-- ============================================================
-- The advertisements table has existed since 0002 but nothing has
-- ever written to it or read from it: AdSlot rendered AdSense from
-- environment variables and ignored the table entirely. This migration
-- makes a booked campaign something the site can actually resolve —
-- "which creative belongs in this slot, on this page, in this locale"
-- — and adds the constraints that keep an unrenderable campaign out of
-- the table in the first place.
--
-- Safe to apply as written: the table holds no rows, so every check
-- below is validated against an empty relation.
-- ============================================================

-- ------------------------------------------------------------
-- Targeting columns
-- ------------------------------------------------------------
alter table public.advertisements
  -- NULL = both locales. An advertiser buying the Urdu audience is a
  -- different sale from one buying the English audience, and the
  -- creative is rarely the same, so this is a first-class filter
  -- rather than something to encode in the campaign name.
  add column locale text,

  -- NULL = every page carrying the placement. Otherwise a locale-less
  -- path prefix ('/blog', '/markets') matched against the page the
  -- slot is rendering on. Stored without the /en or /ur prefix so one
  -- campaign does not have to be booked twice to cover both locales.
  add column page_scope text,

  -- Deterministic resolution when two live campaigns compete for the
  -- same slot. Without it the winner is whatever order Postgres
  -- happened to return, which makes "why is the wrong ad showing"
  -- unanswerable.
  add column priority integer not null default 0,

  -- Required for image creatives. An ad the screen-reader user cannot
  -- identify is both an accessibility failure and, since the whole
  -- point is that paid placements are labelled, a disclosure failure.
  add column image_alt text;

-- ------------------------------------------------------------
-- Integrity
-- ------------------------------------------------------------

-- The placement vocabulary, mirrored from src/content/ad-placements.ts.
-- Deliberately duplicated in SQL and TypeScript, the same way the
-- permission matrix is: a typo'd placement was previously accepted by
-- the database and then silently never rendered, which is the worst
-- possible failure for something a customer has paid for.
alter table public.advertisements
  add constraint advertisements_placement_check check (
    placement in (
      'top-leaderboard', 'in-feed', 'in-article',
      'article-end', 'below-player', 'section-footer'
    )
  );

alter table public.advertisements
  add constraint advertisements_locale_check
    check (locale is null or locale in ('en', 'ur'));

-- A path prefix, not a pattern: lower-case segments, leading slash, no
-- trailing slash, no wildcards. Anything richer would be a matching
-- language that the TypeScript side would have to reimplement exactly.
-- A bare '/' is the homepage and matches only itself — see
-- scopeMatchesPath in src/content/ad-targeting.ts, which is the single
-- definition of what a prefix means.
alter table public.advertisements
  add constraint advertisements_page_scope_check
    check (page_scope is null or page_scope ~ '^/$|^/[a-z0-9-]+(/[a-z0-9-]+)*$');

-- https only. This value becomes an href, so a stored 'javascript:' or
-- 'data:' would be a scripting vector reachable by anyone who ever
-- held ads.manage. The application refuses these too; this is the
-- boundary that holds even if the application is bypassed.
alter table public.advertisements
  add constraint advertisements_target_url_https
    check (target_url is null or target_url ~ '^https://[^\s]+$');

-- A storage object key, never an absolute URL. The CSP img-src list
-- allows our Supabase storage host and nothing else, so an ad pointing
-- at a third-party image host would be blocked by the browser and
-- render as a broken slot. Forcing the creative through our own bucket
-- keeps the served bytes ours.
alter table public.advertisements
  add constraint advertisements_image_path_relative
    check (image_path is null or image_path ~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$');

-- Every kind except adsense is a campaign we sold directly, and a paid
-- placement with nowhere to click is a campaign that cannot deliver.
alter table public.advertisements
  add constraint advertisements_direct_needs_target
    check (kind = 'adsense' or target_url is not null);

-- An image creative without alt text cannot be labelled to a screen
-- reader, so the two travel together.
alter table public.advertisements
  add constraint advertisements_image_needs_alt
    check (image_path is null or image_alt is not null);

alter table public.advertisements
  add constraint advertisements_window_ordered
    check (starts_at is null or ends_at is null or ends_at > starts_at);

-- ------------------------------------------------------------
-- The public read path
-- ------------------------------------------------------------
-- Every page render asks for the live campaigns, so this index carries
-- the whole public query. Partial on is_active because inactive rows
-- are only ever read by staff, one at a time, by id.
create index if not exists advertisements_live_idx
  on public.advertisements (placement, priority desc, created_at desc)
  where is_active;

comment on column public.advertisements.page_scope is
  'Locale-less path prefix the campaign is limited to; NULL means every page carrying the placement.';
comment on column public.advertisements.locale is
  'Locale the campaign is limited to; NULL means both.';
