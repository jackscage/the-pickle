-- ============================================================================
-- The Pickle — migration 0001
-- Accounts, profiles, Pickle Groups, membership and the roster.
-- Covers build-order phases 2 through 5 (PROJECT_SPEC.md section 27).
--
-- READ THIS IF YOU ARE NOT A PROGRAMMER
-- -------------------------------------
-- This file creates the tables the app stores things in, and — more
-- importantly — the rules about who is allowed to read and write each one.
-- Those rules live in the database itself, not in the app. That matters: a
-- bug in a button cannot leak something the database refuses to hand over.
--
-- Three tables are created here:
--
--   profiles       your display name, picture and tagline
--   pickle_groups  a group, its name, and its Pickle Code
--   group_members  who is in which group, and who is an admin
--
-- Deliberately NOT created here: anything to do with pickles themselves.
-- Section 27 of the spec says pickles and the anonymous-author table must be
-- built together, in one step, so that no version of this database ever has
-- a pickle carrying its own author. That is phase 7. Not this file.
--
-- Safe to run more than once. Everything is written so a second run changes
-- nothing.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
-- One row per person. Created by the app right after someone picks a display
-- name — so "does this person have a profile row" is also how the app knows
-- whether they have finished setting up.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null
                check (char_length(trim(display_name)) between 1 and 40),
  avatar_url    text,
  tagline       text
                check (tagline is null or char_length(tagline) <= 60),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Display name, picture and tagline. Shown on the roster, on comments, and '
  'on a pickle ONLY once its author has revealed themselves (spec section 4).';


-- Keep updated_at honest without the app having to remember to set it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 2. pickle_groups
-- ---------------------------------------------------------------------------

create table if not exists public.pickle_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null
               check (char_length(trim(name)) between 1 and 60),
  pickle_code  text not null unique,
  created_by   uuid references auth.users (id) on delete set null,
  locked       boolean not null default false,
  member_cap   smallint not null default 75
               check (member_cap between 1 and 75),
  admin_mode   text not null default 'designated'
               check (admin_mode in ('designated', 'everyone')),
  created_at   timestamptz not null default now()
);

comment on column public.pickle_groups.admin_mode is
  '''designated'' = only members flagged is_admin. ''everyone'' = every member '
  'has admin controls. The creator can switch this (spec section 4).';

comment on column public.pickle_groups.locked is
  'A locked group accepts no new members. Existing members are unaffected.';


-- ---------------------------------------------------------------------------
-- 3. group_members
-- ---------------------------------------------------------------------------
-- This table IS the roster. Note what it does not contain: anything about
-- what a member has submitted. Section 15a of the spec forbids submission
-- status appearing on the roster, and the cleanest way to honour that is for
-- the roster's own table to have nowhere to put it.

-- user_id points at profiles rather than at auth.users on purpose. It makes a
-- real rule impossible to break — you cannot be in a group without a profile,
-- so the roster can never contain a member with no name to show. (It also
-- lets the app fetch a roster and its display names in a single query.)
-- Deleting an account still removes everything: auth.users -> profiles ->
-- group_members, each step cascading to the next.
create table if not exists public.group_members (
  group_id   uuid not null references public.pickle_groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  is_admin   boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx
  on public.group_members (user_id);


-- ---------------------------------------------------------------------------
-- 4. Helper functions
-- ---------------------------------------------------------------------------
-- These exist for a specific technical reason. A security rule on
-- group_members that says "you may read rows of groups you belong to" has to
-- consult group_members to answer — which triggers the same rule again,
-- forever. These helpers are marked `security definer`, which means they run
-- with the table's own privileges and skip the rules, breaking the loop.
--
-- `set search_path` on each one is a standard hardening step: it stops the
-- function from being tricked into calling something other than what it
-- names.

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;


create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.pickle_groups g on g.id = gm.group_id
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and (gm.is_admin or g.admin_mode = 'everyone')
  );
$$;


-- "Is this person in any group with me?" — the test for whether their
-- profile is visible to me at all.
create or replace function public.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;


-- ---------------------------------------------------------------------------
-- 5. Row-Level Security
-- ---------------------------------------------------------------------------
-- With RLS switched on, a table hands back nothing at all unless a policy
-- below explicitly allows it. Default-deny is the point.

alter table public.profiles      enable row level security;
alter table public.pickle_groups enable row level security;
alter table public.group_members enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy. Deleting an account removes the row by cascade; nothing
-- in the app deletes a profile directly.

-- pickle_groups -------------------------------------------------------------
drop policy if exists pickle_groups_select on public.pickle_groups;
create policy pickle_groups_select on public.pickle_groups
  for select to authenticated
  using (public.is_group_member(id));

drop policy if exists pickle_groups_update on public.pickle_groups;
create policy pickle_groups_update on public.pickle_groups
  for update to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

-- No insert policy, deliberately. Groups are only ever created through
-- create_pickle_group() below, so a group can never exist without a code and
-- without its creator already installed as its admin.

-- group_members (the roster) ------------------------------------------------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members
  for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated
  using (public.is_group_admin(group_id));

-- No insert policy. Joining happens only through join_pickle_group(), which
-- is where the 75-member cap and the locked check are enforced. If members
-- could insert their own row directly, both of those would be advisory.


-- ---------------------------------------------------------------------------
-- 6. Pickle Codes
-- ---------------------------------------------------------------------------
-- The alphabet leaves out I, L, O, 0 and 1 on purpose, because those are the
-- characters people mistype when reading a code off someone's phone screen.
-- Eight characters from the remaining 31 is about 850 billion combinations —
-- guessing one is not practical (spec section 21).

create or replace function public.generate_pickle_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.pickle_groups where pickle_code = code
    );
  end loop;
  return code;
end;
$$;


-- Tidies up however someone typed the code: spaces, dashes and lower case
-- all become the canonical form.
create or replace function public.normalise_pickle_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;


-- ---------------------------------------------------------------------------
-- 7. Creating and joining a group
-- ---------------------------------------------------------------------------
-- The error messages raised here are short tokens, not sentences. The
-- friendly wording lives in the app (src/lib/copy.ts) so that it can be
-- rewritten during the Design Stage without anyone touching the database.

create or replace function public.create_pickle_group(p_name text)
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

  v_code := public.generate_pickle_code();

  insert into public.pickle_groups (name, pickle_code, created_by)
  values (left(trim(p_name), 60), v_code, v_user)
  returning id into v_id;

  -- The creator is the group's first admin, always (spec section 15).
  insert into public.group_members (group_id, user_id, is_admin)
  values (v_id, v_user, true);

  return query select v_id, v_code;
end;
$$;


create or replace function public.join_pickle_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user  uuid := auth.uid();
  v_group public.pickle_groups%rowtype;
  v_count int;
begin
  if v_user is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'NO_PROFILE';
  end if;

  -- `for update` holds the group's row for the rest of this statement. Two
  -- people tapping Join at the same moment on a group with one seat left
  -- therefore queue up rather than both getting in (spec section 21).
  select * into v_group
  from public.pickle_groups
  where pickle_code = public.normalise_pickle_code(p_code)
  for update;

  if not found then
    raise exception 'BAD_CODE';
  end if;

  -- Already in? Not an error — just send them to the group.
  if exists (
    select 1 from public.group_members
    where group_id = v_group.id and user_id = v_user
  ) then
    return v_group.id;
  end if;

  if v_group.locked then
    raise exception 'LOCKED';
  end if;

  select count(*) into v_count
  from public.group_members
  where group_id = v_group.id;

  if v_count >= v_group.member_cap then
    raise exception 'FULL';
  end if;

  insert into public.group_members (group_id, user_id, is_admin)
  values (v_group.id, v_user, false);

  return v_group.id;
end;
$$;


-- Leaving. Section 15 of the spec: a group must never end up with zero
-- admins, so the last admin has to hand the role over before they go. The
-- exception is someone who is the only person left — there is nobody to hand
-- it to, and an empty group harms nothing.
create or replace function public.leave_pickle_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user          uuid := auth.uid();
  v_is_admin      boolean;
  v_admin_mode    text;
  v_member_count  int;
  v_admin_count   int;
begin
  if v_user is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  select gm.is_admin, g.admin_mode
    into v_is_admin, v_admin_mode
  from public.group_members gm
  join public.pickle_groups g on g.id = gm.group_id
  where gm.group_id = p_group_id and gm.user_id = v_user;

  if not found then
    raise exception 'NOT_A_MEMBER';
  end if;

  select count(*) into v_member_count
  from public.group_members where group_id = p_group_id;

  select count(*) into v_admin_count
  from public.group_members
  where group_id = p_group_id and is_admin;

  if v_is_admin
     and v_admin_mode = 'designated'
     and v_admin_count = 1
     and v_member_count > 1 then
    raise exception 'LAST_ADMIN';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = v_user;
end;
$$;


-- Admins regenerate the code when it has been shared too widely.
create or replace function public.regenerate_pickle_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'NOT_ADMIN';
  end if;

  v_code := public.generate_pickle_code();

  update public.pickle_groups
  set pickle_code = v_code
  where id = p_group_id;

  return v_code;
end;
$$;


-- ---------------------------------------------------------------------------
-- 8. Profile pictures
-- ---------------------------------------------------------------------------
-- Stored in a bucket called "avatars", one folder per person, named with
-- their user id. The rules below let anyone signed in look at a picture (they
-- have to — pictures appear on rosters) but let only you write into your own
-- folder.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------------
-- 9. Permissions
-- ---------------------------------------------------------------------------
-- Grants say "this role may attempt this kind of query." The policies above
-- then decide which rows it actually gets. Both layers have to allow it.

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles      to authenticated;
grant select                 on public.pickle_groups to authenticated;
grant select, update, delete on public.group_members to authenticated;

grant execute on function public.create_pickle_group(text)     to authenticated;
grant execute on function public.join_pickle_group(text)       to authenticated;
grant execute on function public.leave_pickle_group(uuid)      to authenticated;
grant execute on function public.regenerate_pickle_code(uuid)  to authenticated;
grant execute on function public.is_group_member(uuid)         to authenticated;
grant execute on function public.is_group_admin(uuid)          to authenticated;
grant execute on function public.shares_group_with(uuid)       to authenticated;

-- generate_pickle_code is deliberately NOT callable from outside. It is only
-- ever used inside the two functions above, which already run with elevated
-- privileges. Nobody should be able to mint codes directly.
--
-- The revoke has to name `public` — that is the role every other role
-- inherits from, and Postgres grants execute on a new function to it
-- automatically. Revoking from `authenticated` alone would have left the
-- inherited permission in place and looked like it had worked.
revoke execute on function public.generate_pickle_code() from public;
revoke execute on function public.generate_pickle_code() from anon, authenticated;

-- Signed-out visitors get nothing from any of these tables.
revoke all on public.profiles      from anon;
revoke all on public.pickle_groups from anon;
revoke all on public.group_members from anon;
