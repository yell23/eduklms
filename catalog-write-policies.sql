-- =========================================================
-- EDUBOOK LMS — CATALOG WRITE POLICIES & REALTIME (SAFE / RE-RUNNABLE)
-- Run this in Supabase SQL Editor after rls-policies.sql.
--
-- Why this exists:
--   The app now saves every subject/module/quiz as its own row in the
--   relational tables (subjects / modules / quizzes) instead of rewriting a
--   single JSON blob in shared_state. Without insert/update/delete policies,
--   those writes are silently rejected by RLS, so a newly added subject
--   "saves" on one device but never reaches the database (and disappears).
-- =========================================================

-- Enable RLS (no-op if already enabled)
alter table if exists subjects enable row level security;
alter table if exists modules enable row level security;
alter table if exists quizzes enable row level security;

-- Older deployments were created before cover images existed. The app now
-- writes this column on every subject save, so add it if it's missing.
alter table if exists subjects add column if not exists cover_image text;

-- ---------- SUBJECTS ----------
drop policy if exists "public read subjects" on subjects;
create policy "public read subjects" on subjects for select using (true);

drop policy if exists "public insert subjects" on subjects;
create policy "public insert subjects" on subjects for insert with check (true);

drop policy if exists "public update subjects" on subjects;
create policy "public update subjects" on subjects for update using (true) with check (true);

drop policy if exists "public delete subjects" on subjects;
create policy "public delete subjects" on subjects for delete using (true);

-- ---------- MODULES ----------
drop policy if exists "public read modules" on modules;
create policy "public read modules" on modules for select using (true);

drop policy if exists "public insert modules" on modules;
create policy "public insert modules" on modules for insert with check (true);

drop policy if exists "public update modules" on modules;
create policy "public update modules" on modules for update using (true) with check (true);

drop policy if exists "public delete modules" on modules;
create policy "public delete modules" on modules for delete using (true);

-- ---------- QUIZZES ----------
drop policy if exists "public read quizzes" on quizzes;
create policy "public read quizzes" on quizzes for select using (true);

drop policy if exists "public insert quizzes" on quizzes;
create policy "public insert quizzes" on quizzes for insert with check (true);

drop policy if exists "public update quizzes" on quizzes;
create policy "public update quizzes" on quizzes for update using (true) with check (true);

drop policy if exists "public delete quizzes" on quizzes;
create policy "public delete quizzes" on quizzes for delete using (true);

-- Make sure the anon/authenticated roles can actually reach these tables.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;

-- =========================================================
-- REALTIME REPLICATION (SAFE CONDITIONAL ADD)
-- Lets every open device see a subject/module/quiz added or edited
-- elsewhere instantly, without a manual refresh.
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'subjects') then
    alter publication supabase_realtime add table subjects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'modules') then
    alter publication supabase_realtime add table modules;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quizzes') then
    alter publication supabase_realtime add table quizzes;
  end if;
end $$;
