-- =========================================================
-- EDUBOOK LMS — SUPABASE STORAGE SETUP (SAFE / RE-RUNNABLE)
-- Run this in the Supabase SQL Editor after rls-policies.sql.
--
-- Creates the public "materials" bucket used for module uploads
-- (PDF, video, images, PowerPoint, subject/module covers) so files
-- live in Storage instead of being base64-encoded into localStorage
-- and the shared_state JSON blob.
-- =========================================================

-- 1. Create (or make public) the bucket.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', true, 52428800) -- 50 MB per file
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800;

-- 2. Public read — needed for <img>, <video>, <iframe> and the
--    Office Online viewer (https://view.officeapps.live.com/...).
drop policy if exists "materials public read" on storage.objects;
create policy "materials public read"
  on storage.objects for select
  using (bucket_id = 'materials');

-- 3. Upload / update / delete. The app has no Supabase Auth session
--    (demo logins live in the users table), so we use the same
--    prototype-level trust model as the rest of rls-policies.sql.
drop policy if exists "materials anon insert" on storage.objects;
create policy "materials anon insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'materials');

drop policy if exists "materials anon update" on storage.objects;
create policy "materials anon update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'materials')
  with check (bucket_id = 'materials');

drop policy if exists "materials anon delete" on storage.objects;
create policy "materials anon delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'materials');
