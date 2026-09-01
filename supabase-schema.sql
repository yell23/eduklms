-- =========================================================
-- EDUBOOK LMS — SUPABASE SCHEMA
-- Run this FIRST in Supabase SQL Editor, then run seed-data.sql,
-- then run rls-policies.sql (or paste all three together).
-- =========================================================

-- ---------- CATALOG TABLES (read-mostly reference content) ----------

create table if not exists users (
  email        text primary key,
  password     text not null,          -- plaintext demo-only login, see README note
  role         text not null,          -- 'student' | 'teacher' | 'admin'
  user_id      text,
  name         text,
  first_name   text,
  grade        text,
  section      text,
  department   text,
  title        text,
  subjects     jsonb default '[]'::jsonb
);

create table if not exists subjects (
  id           text primary key,
  name         text not null,
  teacher      text,
  color        jsonb,
  initial      text,
  description  text,
  objectives   jsonb default '[]'::jsonb,
  module_ids   jsonb default '[]'::jsonb,
  cover_image  text
);

create table if not exists modules (
  id           text primary key,
  subject_id   text references subjects(id) on delete cascade,
  number       int,
  title        text,
  description  text,
  reading_mins int,
  quiz_id      text,
  steps        jsonb default '[]'::jsonb,
  pages        jsonb default '[]'::jsonb   -- the whole booklet-reader page array lives here
);

create table if not exists quizzes (
  id           text primary key,
  module_id    text references modules(id) on delete cascade,
  subject_id   text references subjects(id) on delete cascade,
  title        text,
  questions    jsonb default '[]'::jsonb
);

create table if not exists assignments (
  id           text primary key,
  subject_id   text references subjects(id) on delete cascade,
  title        text,
  due          text,
  status       text,
  points       int,
  score        int
);

create table if not exists announcements (
  id           text primary key,
  subject_id   text references subjects(id) on delete cascade,
  type         text,
  title        text,
  body         text,
  author       text,
  occurred_at  bigint,   -- epoch ms, matches Date.now()-based values in data.js
  pinned       boolean default false
);

create table if not exists teacher_students (
  id             text primary key,
  name           text,
  section        text,
  avg_score      int,
  progress       int,
  email          text references users(email),
  module_progress jsonb default '{}'::jsonb
);

-- ---------- MUTABLE STATE (replaces what used to live only in localStorage) ----------

-- One row per logged-in user: their progress, quiz results, downloads,
-- bookmarks, settings, notifications — everything that used to be
-- DB.perUser[email] in app.js.
create table if not exists user_state (
  email        text primary key references users(email) on delete cascade,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Single shared row for content created in-app (teacher/admin adding new
-- subjects/modules/quizzes at runtime) — used to be DB.customSubjects etc.
create table if not exists shared_state (
  id           text primary key default 'global',
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
insert into shared_state (id, data) values ('global', '{"customSubjects":{},"customModules":{},"customQuizzes":{}}'::jsonb)
  on conflict (id) do nothing;
