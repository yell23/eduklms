-- =========================================================
-- EDUBOOK LMS — RLS POLICIES & REALTIME SETUP (SAFE / RE-RUNNABLE)
-- Run this in Supabase SQL Editor.
-- =========================================================

-- Enable RLS on all tables
alter table if exists users enable row level security;
alter table if exists subjects enable row level security;
alter table if exists modules enable row level security;
alter table if exists quizzes enable row level security;
alter table if exists assignments enable row level security;
alter table if exists announcements enable row level security;
alter table if exists teacher_students enable row level security;
alter table if exists user_state enable row level security;
alter table if exists shared_state enable row level security;

-- 1. Catalog Read Policies (Drop first if exists to prevent 42710 error)
drop policy if exists "public read subjects" on subjects;
create policy "public read subjects" on subjects for select using (true);

drop policy if exists "public read modules" on modules;
create policy "public read modules" on modules for select using (true);

drop policy if exists "public read quizzes" on quizzes;
create policy "public read quizzes" on quizzes for select using (true);

drop policy if exists "public read assignments" on assignments;
create policy "public read assignments" on assignments for select using (true);

drop policy if exists "public read announcements" on announcements;
create policy "public read announcements" on announcements for select using (true);

drop policy if exists "public read teacher_students" on teacher_students;
create policy "public read teacher_students" on teacher_students for select using (true);

drop policy if exists "public insert teacher_students" on teacher_students;
create policy "public insert teacher_students" on teacher_students for insert with check (true);

drop policy if exists "public update teacher_students" on teacher_students;
create policy "public update teacher_students" on teacher_students for update using (true);

drop policy if exists "public delete teacher_students" on teacher_students;
create policy "public delete teacher_students" on teacher_students for delete using (true);

-- 2. Users Table Policies
drop policy if exists "public insert users" on users;
create policy "public insert users" on users for insert with check (true);

drop policy if exists "public update users" on users;
create policy "public update users" on users for update using (true);

drop policy if exists "public delete users" on users;
create policy "public delete users" on users for delete using (true);

-- 3. verify_login Security Definer Function (handles safe login without exposing all passwords)
create or replace function verify_login(p_email text, p_password text)
returns table (email text, role text, user_id text, name text, first_name text,
               grade text, section text, department text, title text, subjects jsonb)
language sql
security definer
set search_path = public
as $$
  select u.email, u.role, u.user_id, u.name, u.first_name,
         u.grade, u.section, u.department, u.title, u.subjects
  from users u
  where u.email = p_email and u.password = p_password;
$$;

-- 4. User State Policies (student progress / quiz answers)
drop policy if exists "read own-ish state" on user_state;
create policy "read own-ish state" on user_state for select using (true);

drop policy if exists "write own-ish state" on user_state;
create policy "write own-ish state" on user_state for insert with check (true);

drop policy if exists "update own-ish state" on user_state;
create policy "update own-ish state" on user_state for update using (true);

-- 5. Shared State Policies (course content created at runtime)
drop policy if exists "read shared state" on shared_state;
create policy "read shared state" on shared_state for select using (true);

drop policy if exists "update shared state" on shared_state;
create policy "update shared state" on shared_state for update using (true);

-- =========================================================
-- 6. REALTIME REPLICATION (SAFE CONDITIONAL ADD)
-- Enables instant WebSocket broadcasts across all devices
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'shared_state') then
    alter publication supabase_realtime add table shared_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_state') then
    alter publication supabase_realtime add table user_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'users') then
    alter publication supabase_realtime add table users;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'teacher_students') then
    alter publication supabase_realtime add table teacher_students;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'assignments') then
    alter publication supabase_realtime add table assignments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'announcements') then
    alter publication supabase_realtime add table announcements;
  end if;
end $$;
