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

-- 1. Catalog Policies (read + write — teachers/admins create content in-app)
drop policy if exists "public read subjects" on subjects;
create policy "public read subjects" on subjects for select using (true);
drop policy if exists "public insert subjects" on subjects;
create policy "public insert subjects" on subjects for insert with check (true);
drop policy if exists "public update subjects" on subjects;
create policy "public update subjects" on subjects for update using (true) with check (true);
drop policy if exists "public delete subjects" on subjects;
create policy "public delete subjects" on subjects for delete using (true);

drop policy if exists "public read modules" on modules;
create policy "public read modules" on modules for select using (true);
drop policy if exists "public insert modules" on modules;
create policy "public insert modules" on modules for insert with check (true);
drop policy if exists "public update modules" on modules;
create policy "public update modules" on modules for update using (true) with check (true);
drop policy if exists "public delete modules" on modules;
create policy "public delete modules" on modules for delete using (true);

drop policy if exists "public read quizzes" on quizzes;
create policy "public read quizzes" on quizzes for select using (true);
drop policy if exists "public insert quizzes" on quizzes;
create policy "public insert quizzes" on quizzes for insert with check (true);
drop policy if exists "public update quizzes" on quizzes;
create policy "public update quizzes" on quizzes for update using (true) with check (true);
drop policy if exists "public delete quizzes" on quizzes;
create policy "public delete quizzes" on quizzes for delete using (true);

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

-- 2. Schema Adjustments & Grants
alter table if exists users alter column password drop not null;
alter table if exists users alter column password set default '';
-- Older deployments were created before subject cover images existed.
alter table if exists subjects add column if not exists cover_image text;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;

-- Users Table Policies
drop policy if exists "public select users" on users;
create policy "public select users" on users for select using (true);

drop policy if exists "public insert users" on users;
create policy "public insert users" on users for insert with check (true);

drop policy if exists "public update users" on users;
create policy "public update users" on users for update using (true);

drop policy if exists "public delete users" on users;
create policy "public delete users" on users for delete using (true);

-- 3. sync_user_profile Security Definer Function (handles Google OAuth & student registrations safely)
create or replace function sync_user_profile(
  p_email text,
  p_password text default '',
  p_role text default 'student',
  p_user_id text default null,
  p_name text default null,
  p_first_name text default null,
  p_grade text default null,
  p_section text default null,
  p_department text default null,
  p_title text default null,
  p_subjects jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_existing users%rowtype;
begin
  select * into v_existing from users where email = p_email;
  if found then
    v_user_id := coalesce(v_existing.user_id, p_user_id);
    update users set
      password = case when p_password is not null and p_password <> '' then p_password else users.password end,
      name = coalesce(p_name, v_existing.name),
      first_name = coalesce(p_first_name, v_existing.first_name),
      role = coalesce(v_existing.role, p_role),
      grade = coalesce(p_grade, v_existing.grade),
      section = coalesce(p_section, v_existing.section),
      department = coalesce(p_department, v_existing.department),
      title = coalesce(p_title, v_existing.title),
      subjects = case when p_subjects is not null and jsonb_array_length(p_subjects) > 0 then p_subjects else v_existing.subjects end
    where email = p_email;
  else
    v_user_id := coalesce(p_user_id, 'STU-' || floor(random() * 900000 + 100000)::text);
    insert into users (email, password, role, user_id, name, first_name, grade, section, department, title, subjects)
    values (p_email, coalesce(p_password, ''), coalesce(p_role, 'student'), v_user_id, p_name, p_first_name, p_grade, p_section, p_department, p_title, coalesce(p_subjects, '[]'::jsonb));
  end if;

  -- If student, also ensure row exists in teacher_students
  if coalesce(v_existing.role, p_role) = 'student' then
    insert into teacher_students (id, name, section, avg_score, progress, email, module_progress)
    values (v_user_id, coalesce(p_name, 'Student'), coalesce(p_section, 'Einstein'), 0, 0, p_email, '{}'::jsonb)
    on conflict (id) do update set
      name = coalesce(excluded.name, teacher_students.name),
      section = coalesce(excluded.section, teacher_students.section),
      email = excluded.email;
  end if;

  -- Ensure user_state row exists for this account
  insert into user_state (email, data)
  values (p_email, '{}'::jsonb)
  on conflict (email) do nothing;

  return jsonb_build_object(
    'email', p_email,
    'role', coalesce(v_existing.role, p_role),
    'id', v_user_id,
    'name', coalesce(p_name, v_existing.name),
    'firstName', coalesce(p_first_name, v_existing.first_name),
    'grade', coalesce(p_grade, v_existing.grade),
    'section', coalesce(p_section, v_existing.section),
    'department', coalesce(p_department, v_existing.department),
    'title', coalesce(p_title, v_existing.title),
    'subjects', coalesce(p_subjects, v_existing.subjects, '[]'::jsonb)
  );
end;
$$;

-- 4. verify_login Security Definer Function (handles safe login without exposing all passwords)
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
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'subjects') then
    alter publication supabase_realtime add table subjects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'modules') then
    alter publication supabase_realtime add table modules;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quizzes') then
    alter publication supabase_realtime add table quizzes;
  end if;
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
