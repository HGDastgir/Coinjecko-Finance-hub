-- ============================================================
-- 0006 — Public editorial surfaces: breaking news, blog, vlogs
--
-- No new tables: breaking news is `articles` with
-- article_type = 'breaking_news', the blog is the same table read by
-- published_at, and vlogs are `videos`. This migration fixes one
-- access-control gap and adds the indexes those read paths need.
-- ============================================================

-- 0002 let anyone with media.manage_video WRITE videos, but the SELECT
-- policy only admitted published rows or content.review. A
-- video_manager could therefore insert a draft and then not see it —
-- their own admin list came back empty. Managing a row implies reading
-- it, so the select policy has to admit the same permission.
drop policy if exists "videos: public read published" on public.videos;

create policy "videos: public read published"
  on public.videos for select
  using (
    status = 'published'
    or public.has_permission('content.review')
    or public.has_permission('media.manage_video')
  );

-- Same gap for podcasts, fixed now rather than left as a trap for
-- whoever builds that surface next.
drop policy if exists "podcasts: public read published" on public.podcasts;

create policy "podcasts: public read published"
  on public.podcasts for select
  using (
    status = 'published'
    or public.has_permission('content.review')
    or public.has_permission('media.manage_podcast')
  );

-- ------------------------------------------------------------
-- Read-path indexes
-- ------------------------------------------------------------

-- The breaking-news strip runs on every page render: newest published
-- rows of one article_type.
create index if not exists idx_articles_type_status_published
  on public.articles (article_type, status, published_at desc);

-- The vlog index: newest published videos, optionally per locale.
create index if not exists idx_videos_status_published
  on public.videos (status, published_at desc);

create index if not exists idx_videos_locale_status
  on public.videos (locale, status);
