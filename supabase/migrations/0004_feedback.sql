-- ============================================================================
-- The Pickle — migration 0004
-- The Feedback Module (build brief task 10). TEMPORARY, built to be removed.
--
-- READ THIS IF YOU ARE NOT A PROGRAMMER
-- -------------------------------------
-- While the app is being tested, testers can send feedback from whatever
-- screen they are on. It all lands in one table that the project owner and
-- the board can read on one screen.
--
-- When the app goes public, the whole feature comes out. The statements to
-- remove this table are at the bottom of this file, and src/feedback/README.md
-- lists every other step.
--
-- Feedback is ATTRIBUTED, not anonymous: each report carries who sent it,
-- so the owner can follow up. That is intended.
--
-- But it must never become a back door around pickle anonymity. So a report
-- records the SCREEN someone was on — never a pickle's words, never a pickle
-- id, and nothing from pickle_authors. Look at the columns below: there is
-- nowhere to put any of those.
--
-- Safe to run more than once.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Who may read the feedback pool
-- ---------------------------------------------------------------------------
-- The project owner and the board. Each needs an account in the app; their
-- account is then added here by hand (see src/feedback/README.md). Kept out
-- of this file on purpose, so no one's email address sits in the code.

create table if not exists public.feedback_readers (
  user_id  uuid primary key references auth.users (id) on delete cascade
);

alter table public.feedback_readers enable row level security;

-- A person can see their own row — that is how the app knows whether to
-- show them the pool. No one can add, change or remove rows from the app.
drop policy if exists feedback_readers_select_own on public.feedback_readers;
create policy feedback_readers_select_own on public.feedback_readers
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_feedback_reader()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.feedback_readers where user_id = auth.uid()
  );
$$;


-- ---------------------------------------------------------------------------
-- 2. The feedback itself
-- ---------------------------------------------------------------------------

create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),

  -- Who sent it. Kept if their account is later deleted, minus the link.
  user_id        uuid references auth.users (id) on delete set null default auth.uid(),
  reporter_name  text,

  kind           text not null check (kind in ('bug', 'suggestion', 'confusion')),
  message        text not null check (char_length(trim(message)) between 1 and 2000),

  -- Where they were: the screen's address and its plain-English name, plus
  -- the group and jar names at the time, so a reader who is not in that
  -- group can still follow the report.
  screen_path    text not null check (char_length(screen_path) <= 300),
  screen_name    text not null check (char_length(screen_name) <= 100),
  group_id       uuid,
  group_name     text,
  jar_id         uuid,
  jar_name       text,

  created_at     timestamptz not null default now()
);

comment on table public.feedback is
  'Tester feedback (temporary). Attributed, not anonymous. Must never hold '
  'pickle content, pickle ids or anything from pickle_authors.';

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

-- Anyone signed in can send feedback, as themselves only.
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Only readers can read it. No one can edit or delete it from the app.
drop policy if exists feedback_select_readers on public.feedback;
create policy feedback_select_readers on public.feedback
  for select to authenticated
  using (public.is_feedback_reader());


-- ---------------------------------------------------------------------------
-- 3. Permissions
-- ---------------------------------------------------------------------------

grant select         on public.feedback_readers to authenticated;
grant select, insert on public.feedback         to authenticated;
revoke all on public.feedback_readers from anon;
revoke all on public.feedback         from anon;

grant execute  on function public.is_feedback_reader() to authenticated;
revoke execute on function public.is_feedback_reader() from public, anon;


-- ============================================================================
-- REMOVING THE FEEDBACK MODULE
-- ============================================================================
-- When the app goes public, run these in the Supabase SQL editor (after
-- exporting the feedback first if anyone wants to keep it). They delete the
-- feedback and the readers list permanently. Nothing else depends on them.
--
--   drop table if exists public.feedback;
--   drop function if exists public.is_feedback_reader();
--   drop table if exists public.feedback_readers;
--
-- Then follow the rest of src/feedback/README.md.
-- ============================================================================
