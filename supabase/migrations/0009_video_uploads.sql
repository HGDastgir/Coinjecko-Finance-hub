-- ============================================================
-- 0009 — Uploaded video files
--
-- Adds a third video source alongside 'youtube' and 'self_hosted':
-- 'upload', a file the editor picked from their computer that lives in
-- Supabase Storage. Existing rows are untouched — every column below
-- is nullable and nothing about provider/provider_ref changes, so the
-- two existing sources keep working exactly as before.
--
-- WHY DIRECT-TO-STORAGE, NOT THROUGH THE APP: a Vercel serverless
-- function caps request bodies at a few megabytes and its filesystem
-- is ephemeral, so a video posted to our own server could neither
-- arrive nor survive. Uploads go straight from the browser to Storage
-- using a short-lived signed URL that the server issues only after
-- checking the caller's permission.
-- ============================================================

alter table public.videos
  add column if not exists storage_path      text,
  add column if not exists original_filename text,
  add column if not exists file_size_bytes   bigint
    check (file_size_bytes is null or file_size_bytes > 0),
  add column if not exists mime_type         text,
  add column if not exists poster_path       text,
  add column if not exists uploaded_at       timestamptz;

comment on column public.videos.storage_path is
  'Object key inside the video-media bucket. Set only when provider = ''upload''.';
comment on column public.videos.poster_path is
  'Optional thumbnail in the article-media bucket, used as the <video> poster.';

-- An uploaded video is meaningless without the object it points at.
-- Enforced here rather than trusted from the form.
alter table public.videos
  drop constraint if exists upload_needs_storage_path;

alter table public.videos
  add constraint upload_needs_storage_path
  check (provider is distinct from 'upload' or storage_path is not null);

create index if not exists idx_videos_storage_path
  on public.videos (storage_path)
  where storage_path is not null;

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------
-- Public read: these play in a <video> tag on pages served to
-- everyone, and signing every request would break range requests and
-- CDN caching, which is what makes seeking work at all.
--
-- The MIME allow-list is the hard boundary. It admits three video
-- container types and nothing else — no HTML, no SVG, no scripts, no
-- archives — so this bucket cannot become a file drop for arbitrary
-- payloads served from a domain the browser trusts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-media',
  'video-media',
  true,
  209715200, -- 200 MB; also enforced in the app before upload starts
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "video media: public read"   on storage.objects;
drop policy if exists "video media: staff upload"  on storage.objects;
drop policy if exists "video media: staff update"  on storage.objects;
drop policy if exists "video media: staff delete"  on storage.objects;

create policy "video media: public read"
  on storage.objects for select
  using (bucket_id = 'video-media');

-- Writes need media.manage_video, not merely media.upload: adding a
-- 200 MB object is a heavier privilege than attaching an article
-- image, and it is the same permission that gates the videos table.
create policy "video media: staff upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'video-media'
    and public.has_permission('media.manage_video')
  );

create policy "video media: staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'video-media' and public.has_permission('media.manage_video'))
  with check (bucket_id = 'video-media' and public.has_permission('media.manage_video'));

create policy "video media: staff delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'video-media'
    and public.has_permission('media.manage_video')
  );
