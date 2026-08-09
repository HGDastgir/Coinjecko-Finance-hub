-- ============================================================
-- 0010 — Stop public clients enumerating the media buckets
--
-- 0008 and 0009 each granted a broad SELECT on storage.objects so
-- that "public read" would work. That was unnecessary and leaky.
--
-- Supabase public buckets already bypass access control for RETRIEVAL:
-- anyone with the object URL can fetch it, policy or no policy. What
-- the SELECT policy actually enabled was LISTING — any visitor with
-- the anon key could call /storage/v1/object/list and enumerate every
-- file in the bucket, including drafts not yet referenced by any
-- published row. Supabase's own dashboard flags this.
--
-- Dropping the policies removes enumeration and changes nothing about
-- playback or <img> loading, which go through the public URL path.
-- Writes are untouched: INSERT/UPDATE/DELETE still require their
-- permissions from 0008 and 0009.
-- ============================================================

drop policy if exists "article media: public read" on storage.objects;
drop policy if exists "video media: public read"   on storage.objects;
