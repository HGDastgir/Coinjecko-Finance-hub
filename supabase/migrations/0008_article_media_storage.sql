-- ============================================================
-- 0008 — Storage for editorial images
--
-- One public bucket for article and vlog artwork. Public READ is the
-- point: these images are embedded in pages served to everyone, and
-- signing every one of them would break caching for no security gain
-- — a published article's hero image is already public information.
--
-- WRITES are the part that matters, and they are permission-gated the
-- same way the content tables are: media.upload, checked through the
-- same has_permission() function every other policy uses. So an
-- account with no role can authenticate and still upload nothing.
--
-- The bucket carries a hard size limit and an image-only MIME
-- allow-list at the bucket level, so a bad or compromised client
-- cannot turn editorial storage into a file drop for arbitrary
-- payloads. HTML and SVG are deliberately NOT allowed: both can carry
-- script, and they would be served from our own origin.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-media',
  'article-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "article media: public read" on storage.objects;
drop policy if exists "article media: staff upload" on storage.objects;
drop policy if exists "article media: staff update" on storage.objects;
drop policy if exists "article media: staff delete" on storage.objects;

create policy "article media: public read"
  on storage.objects for select
  using (bucket_id = 'article-media');

create policy "article media: staff upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-media'
    and public.has_permission('media.upload')
  );

create policy "article media: staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-media' and public.has_permission('media.upload'))
  with check (bucket_id = 'article-media' and public.has_permission('media.upload'));

-- Deleting published artwork is a content action, not an upload one.
create policy "article media: staff delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-media'
    and public.has_permission('content.edit_any')
  );
