-- ============================================================================
-- The Pickle — migration 0002
-- Jars. Build-order phase 6 (PROJECT_SPEC.md sections 10 and 27).
--
-- READ THIS IF YOU ARE NOT A PROGRAMMER
-- -------------------------------------
-- A jar is one round of the game. It moves through three states, in order,
-- and never backwards:
--
--   accepting  ->  sealed  ->  opened
--
--   accepting  people can put pickles in
--   sealed     no more pickles; not revealed yet ("sealed, opening tonight")
--   opened     revealed to the whole group, forever. Becomes a Past Jar.
--
-- Sealing is optional — an admin can go straight from accepting to opened.
-- Opening can never be undone.
--
-- Each Pickle Group has at most ONE current jar (accepting or sealed) at a
-- time. Every opened jar is kept, and those are the group's Past Jars.
--
-- How the next jar begins is a per-group setting, chosen when the group is
-- made and changeable later by an admin:
--
--   'admin'      an admin starts each new jar by hand (the default)
--   'automatic'  a fresh jar appears the moment the previous one is opened
--
-- As in migration 0001, the rules live HERE, in database functions, not in
-- the app. Nobody — not even an admin — can change a jar's state by writing
-- to the table directly. There is no policy that allows it. The functions
-- below are the only door, and they check who is knocking.
--
-- Deliberately NOT created here: anything about pickles. Pickles and their
-- anonymous-author table arrive together in migration 0003.
--
-- Safe to run more than once.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. The group's "how do jars start" setting
-- ---------------------------------------------------------------------------
-- Adding a column with a default fills it in for groups that already exist,
-- so every existing group becomes an 'admin' group and nothing about it
-- changes until an admin decides otherwise.

alter table public.pickle_groups
  add column if not exists jar_start_mode text not null default 'admin';

alter table public.pickle_groups
  drop constraint if exists pickle_groups_jar_start_mode_check;
alter table public.pickle_groups
  add constraint pickle_groups_jar_start_mode_check
  check (jar_start_mode in ('admin', 'automatic'));

comment on column public.pickle_groups.jar_start_mode is
  '''admin'' = an admin starts each new jar. ''automatic'' = a new jar starts '
  'by itself whenever the previous one is opened, and when the group is made.';


-- ---------------------------------------------------------------------------
-- 2. jars
-- ---------------------------------------------------------------------------

create table if not exists public.jars (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.pickle_groups (id) on delete cascade,
  name           text
                 check (name is null or char_length(trim(name)) between 1 and 60),
  status         text not null default 'accepting'
                 check (status in ('accepting', 'sealed', 'opened')),

  -- Timed jars (spec section 10a) are NOT built yet. These two columns exist
  -- so the feature is designed for rather than bolted on later. Settled: a
  -- timer belongs to one jar, and the admin chooses whether members see it.
  --
  -- WARNING FOR WHOEVER BUILDS TIMED JARS: Row-Level Security hides rows,
  -- not columns. Any member who can see this jar receives opens_at, whatever
  -- timer_visible says. Before a hidden timer is ever set, opens_at must be
  -- moved somewhere members cannot read (its own table, or served only
  -- through a function). Until then nothing writes to it and it stays empty.
  opens_at       timestamptz,
  timer_visible  boolean not null default false,

  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  sealed_at      timestamptz,
  opened_at      timestamptz,

  -- The timestamps must agree with the state. These make an inconsistent
  -- jar (say, "accepting" but with an opened time) impossible to store.
  constraint jars_opened_has_time
    check ((status = 'opened') = (opened_at is not null)),
  constraint jars_accepting_untouched
    check (status <> 'accepting' or (sealed_at is null and opened_at is null))
);

comment on table public.jars is
  'One round of pickles. accepting -> sealed (optional) -> opened. Opened '
  'jars are the group''s Past Jars. State only changes through the functions '
  'in migration 0002.';

-- "At most one current jar per group", enforced by the database. A second
-- accepting-or-sealed jar for the same group simply cannot be stored.
create unique index if not exists jars_one_current_per_group
  on public.jars (group_id)
  where status <> 'opened';

-- Past Jars are listed newest-opened first.
create index if not exists jars_group_opened_idx
  on public.jars (group_id, opened_at desc);

create index if not exists jars_created_by_idx
  on public.jars (created_by);


-- ---------------------------------------------------------------------------
-- 3. Row-Level Security
-- ---------------------------------------------------------------------------
-- Members of a group can see that group's jars. That is all anyone can do
-- with this table directly. No insert, update or delete policy exists, on
-- purpose: every change goes through the functions below.

alter table public.jars enable row level security;

drop policy if exists jars_select on public.jars;
create policy jars_select on public.jars
  for select to authenticated
  using (public.is_group_member(group_id));


-- ---------------------------------------------------------------------------
-- 4. Starting a jar
-- ---------------------------------------------------------------------------

-- The shared core of "start a new jar", used by both the admin button and
-- the automatic mode. Not callable from the app (see the revoke at the end):
-- it does no permission check of its own, so it must only be reached through
-- functions that do.
create or replace function public.create_current_jar(
  p_group_id uuid,
  p_name     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.jars (group_id, name, created_by)
  values (p_group_id, nullif(left(trim(p_name), 60), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;


-- What an admin's "Start a new jar" button calls.
create or replace function public.start_jar(
  p_group_id uuid,
  p_name     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  if not public.is_group_admin(p_group_id) then
    raise exception 'NOT_ADMIN';
  end if;

  -- Hold the group's row so two admins tapping at once queue up instead of
  -- racing. The unique index above would stop a second jar anyway; this
  -- just turns that into a clean message rather than a raw database error.
  perform 1 from public.pickle_groups where id = p_group_id for update;

  if exists (
    select 1 from public.jars
    where group_id = p_group_id and status <> 'opened'
  ) then
    raise exception 'JAR_ALREADY_CURRENT';
  end if;

  return public.create_current_jar(p_group_id, p_name);
end;
$$;


-- Automatic mode. Fires when a group is made, and when an admin switches an
-- existing group to automatic: if the group is automatic and has no current
-- jar, give it one. Living in a trigger means it holds however the setting
-- got changed.
create or replace function public.ensure_automatic_jar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.jar_start_mode = 'automatic'
     and not exists (
       select 1 from public.jars
       where group_id = new.id and status <> 'opened'
     ) then
    perform public.create_current_jar(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists pickle_groups_automatic_jar on public.pickle_groups;
create trigger pickle_groups_automatic_jar
  after insert or update of jar_start_mode on public.pickle_groups
  for each row execute function public.ensure_automatic_jar();


-- ---------------------------------------------------------------------------
-- 5. Naming, sealing and opening
-- ---------------------------------------------------------------------------

-- Give a jar a name, change it, or clear it (pass an empty name). Allowed at
-- any stage, including after opening, so a Past Jar can be labelled later.
create or replace function public.rename_jar(p_jar_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  select group_id into v_group from public.jars where id = p_jar_id;

  -- Someone outside the group gets the same answer as a jar that does not
  -- exist. "You can't see it" and "it isn't there" should look identical.
  if not found or not public.is_group_member(v_group) then
    raise exception 'JAR_NOT_FOUND';
  end if;

  if not public.is_group_admin(v_group) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.jars
  set name = nullif(left(trim(coalesce(p_name, '')), 60), '')
  where id = p_jar_id;
end;
$$;


-- Seal the Jar: no more pickles go in. Only from 'accepting'.
create or replace function public.seal_jar(p_jar_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jar public.jars%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  -- `for update` holds the jar while this runs, so a seal and an open
  -- arriving together happen one after the other, not on top of each other.
  select * into v_jar from public.jars where id = p_jar_id for update;

  if not found or not public.is_group_member(v_jar.group_id) then
    raise exception 'JAR_NOT_FOUND';
  end if;

  if not public.is_group_admin(v_jar.group_id) then
    raise exception 'NOT_ADMIN';
  end if;

  if v_jar.status <> 'accepting' then
    raise exception 'JAR_NOT_ACCEPTING';
  end if;

  update public.jars
  set status = 'sealed', sealed_at = now()
  where id = p_jar_id;
end;
$$;


-- Open The Jar. Permanent. From 'accepting' or 'sealed'.
--
-- The "are you sure?" step happens on screen before this is ever called.
-- Once it runs, the jar is a Past Jar and there is no function that turns
-- it back.
--
-- In an automatic group, the next jar starts in the same step, so the group
-- is never left without one.
create or replace function public.open_jar(p_jar_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jar  public.jars%rowtype;
  v_mode text;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  select * into v_jar from public.jars where id = p_jar_id for update;

  if not found or not public.is_group_member(v_jar.group_id) then
    raise exception 'JAR_NOT_FOUND';
  end if;

  if not public.is_group_admin(v_jar.group_id) then
    raise exception 'NOT_ADMIN';
  end if;

  if v_jar.status = 'opened' then
    raise exception 'JAR_ALREADY_OPENED';
  end if;

  update public.jars
  set status = 'opened', opened_at = now()
  where id = p_jar_id;

  select jar_start_mode into v_mode
  from public.pickle_groups where id = v_jar.group_id;

  if v_mode = 'automatic' then
    perform public.create_current_jar(v_jar.group_id);
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Creating a group, now with the jar setting
-- ---------------------------------------------------------------------------
-- Replaces create_pickle_group from migration 0001. Identical except for the
-- new second input. It defaults to 'admin', so anything still calling it
-- the old way (with just a name) keeps working exactly as before.
--
-- The old version has to be removed first: Postgres treats a function with
-- a different list of inputs as a separate function, and two near-identical
-- ones side by side would make calls ambiguous.

drop function if exists public.create_pickle_group(text);

create or replace function public.create_pickle_group(
  p_name            text,
  p_jar_start_mode  text default 'admin'
)
returns table (group_id uuid, pickle_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'NO_PROFILE';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'NO_NAME';
  end if;

  if coalesce(p_jar_start_mode, '') not in ('admin', 'automatic') then
    raise exception 'BAD_JAR_START_MODE';
  end if;

  v_code := public.generate_pickle_code();

  -- If the mode is 'automatic', the trigger above gives the group its first
  -- jar as part of this same insert.
  insert into public.pickle_groups (name, pickle_code, created_by, jar_start_mode)
  values (left(trim(p_name), 60), v_code, v_user, p_jar_start_mode)
  returning id into v_id;

  -- The creator is the group's first admin, always (spec section 15).
  insert into public.group_members (group_id, user_id, is_admin)
  values (v_id, v_user, true);

  return query select v_id, v_code;
end;
$$;


-- ---------------------------------------------------------------------------
-- 7. Permissions
-- ---------------------------------------------------------------------------

grant select on public.jars to authenticated;
revoke all on public.jars from anon;

grant execute on function public.create_pickle_group(text, text) to authenticated;
grant execute on function public.start_jar(uuid, text)           to authenticated;
grant execute on function public.rename_jar(uuid, text)          to authenticated;
grant execute on function public.seal_jar(uuid)                  to authenticated;
grant execute on function public.open_jar(uuid)                  to authenticated;

-- Internal only. create_current_jar skips the admin check by design, so it
-- must be unreachable from outside; ensure_automatic_jar is a trigger and
-- has no business being called directly. Revoked from `public` because
-- that is where the automatic grant lives (see the note in migration 0001).
revoke execute on function public.create_current_jar(uuid, text) from public;
revoke execute on function public.create_current_jar(uuid, text) from anon, authenticated;
revoke execute on function public.ensure_automatic_jar()          from public;
revoke execute on function public.ensure_automatic_jar()          from anon, authenticated;

-- Signed-out visitors can call none of the jar functions.
revoke execute on function public.create_pickle_group(text, text) from public, anon;
revoke execute on function public.start_jar(uuid, text)           from public, anon;
revoke execute on function public.rename_jar(uuid, text)          from public, anon;
revoke execute on function public.seal_jar(uuid)                  from public, anon;
revoke execute on function public.open_jar(uuid)                  from public, anon;
