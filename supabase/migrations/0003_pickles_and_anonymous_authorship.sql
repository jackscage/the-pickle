-- ============================================================================
-- The Pickle — migration 0003
-- Pickles, and who wrote them — built together, in one file, on purpose.
-- Build-order phase 7 (PROJECT_SPEC.md sections 9, 11 and 27).
--
-- READ THIS IF YOU ARE NOT A PROGRAMMER
-- -------------------------------------
-- This is the file the whole product rests on. A pickle is anonymous, and
-- that has to be true in the database itself, not just on screen.
--
-- The database's security rules (Row-Level Security) decide which ROWS a
-- person may read. They cannot hide individual COLUMNS. So if a pickle's
-- row held its author, every member allowed to read the pickle would also
-- receive the author — whatever the screen showed.
--
-- The answer is to keep the two things in separate tables:
--
--   pickles          what was written. No author. No timestamp.
--   pickle_authors   who wrote which pickle, and when. Each person can read
--                    ONLY their own rows here — never anyone else's.
--
-- There is no author column in `pickles` to leak. A mistake in a rule
-- cannot expose a column that does not exist. You can check this promise
-- yourself just by reading the table definition below.
--
-- Both tables are created in this one file so that no version of this
-- database has ever had a pickle carrying its author.
--
-- WHY THERE IS NO TIMESTAMP ON `pickles` (a deliberate change to the spec)
-- ----------------------------------------------------------------------
-- The spec listed created_at on pickles. But members can read every pickle
-- in an opened jar, so they would read the exact submission times too — and
-- "a pickle went in at 9:14pm, and Sam was on their phone at 9:14pm" undoes
-- the anonymity as surely as a name would. So the time lives in
-- pickle_authors, where only the author can see it. Decided with the project
-- owner on 4 Oct 2026.
--
-- For the same reason, pickles are shown in an order that says nothing about
-- when they went in (sorted by their random id).
--
-- Safe to run more than once.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. pickles — the content, and nothing that identifies anyone
-- ---------------------------------------------------------------------------

create table if not exists public.pickles (
  -- A random id (UUID version 4). Unlike some id formats, it carries no
  -- hidden timestamp or sequence number.
  id            uuid primary key default gen_random_uuid(),
  jar_id        uuid not null references public.jars (id) on delete cascade,
  text_content  text
                check (text_content is null
                       or char_length(text_content) between 1 and 1200),
  -- Drawings are a later phase. WARNING FOR WHOEVER BUILDS THEM: the stored
  -- file's path must not contain the author's user id (the usual Supabase
  -- pattern of one folder per person would leak authorship through the URL).
  drawing_url   text,
  -- Whether the author has chosen to reveal themselves (spec section 14).
  -- Not built yet; nothing sets it, and it starts false for every pickle.
  revealed      boolean not null default false,

  constraint pickles_has_content
    check (text_content is not null or drawing_url is not null)
);

comment on table public.pickles is
  'Pickle content. Deliberately has NO author column and NO timestamp — see '
  'migration 0003 and PROJECT_SPEC.md section 9. Never add either.';

create index if not exists pickles_jar_idx on public.pickles (jar_id);


-- ---------------------------------------------------------------------------
-- 2. pickle_authors — who wrote what, readable only by the person themselves
-- ---------------------------------------------------------------------------

create table if not exists public.pickle_authors (
  pickle_id   uuid primary key references public.pickles (id) on delete cascade,
  -- Deleting an account deletes its authorship rows. The pickles stay,
  -- anonymous for good.
  author_id   uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.pickle_authors is
  'Who wrote each pickle. RLS: a person may read only rows where author_id is '
  'themselves. Never join this into anything served to other members.';

-- Serves both "my own rows" and the rate limit below.
create index if not exists pickle_authors_author_idx
  on public.pickle_authors (author_id, created_at);


-- ---------------------------------------------------------------------------
-- 3. Who may read pickles
-- ---------------------------------------------------------------------------
-- A pickle is readable only once its jar has been opened, and only by
-- members of that jar's group. Before then nobody can read what is inside —
-- not admins, and not the author either. The jar opens all at once.

create or replace function public.can_read_jar_pickles(p_jar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.jars j
    where j.id = p_jar_id
      and j.status = 'opened'
      and public.is_group_member(j.group_id)
  );
$$;


-- ---------------------------------------------------------------------------
-- 4. Row-Level Security
-- ---------------------------------------------------------------------------
-- Reading only. No insert, update or delete policy exists on either table:
-- pickles go in through put_pickle() below, and nothing edits them.

alter table public.pickles        enable row level security;
alter table public.pickle_authors enable row level security;

drop policy if exists pickles_select on public.pickles;
create policy pickles_select on public.pickles
  for select to authenticated
  using (public.can_read_jar_pickles(jar_id));

-- THE rule. You can see an authorship row only if it is yours.
-- `(select auth.uid())` rather than `auth.uid()` makes the database work out
-- who you are once per query instead of once per row; the meaning is the same.
drop policy if exists pickle_authors_select_own on public.pickle_authors;
create policy pickle_authors_select_own on public.pickle_authors
  for select to authenticated
  using (author_id = (select auth.uid()));


-- ---------------------------------------------------------------------------
-- 5. Put It In The Pickle
-- ---------------------------------------------------------------------------
-- The only way a pickle enters the database. It writes the pickle and its
-- authorship row together: either both happen or neither does, so there is
-- never an authorless pickle or a pickle-less authorship.

create or replace function public.put_pickle(p_jar_id uuid, p_text text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Spam protection (spec section 19). Unlimited pickles per person is
  -- deliberate, so this is aimed at abuse, not enthusiasm: at most this many
  -- pickles from one person in any ten minutes. Tunable.
  max_per_ten_minutes constant int := 20;

  v_user   uuid := auth.uid();
  v_jar    public.jars%rowtype;
  v_text   text := trim(coalesce(p_text, ''));
  v_recent int;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  -- `for share` lets many pickles go in at once but makes a seal or an open
  -- of this same jar wait until they have finished — so nothing slips in
  -- after the jar is sealed.
  select * into v_jar from public.jars where id = p_jar_id for share;

  if not found or not public.is_group_member(v_jar.group_id) then
    raise exception 'JAR_NOT_FOUND';
  end if;

  if v_jar.status <> 'accepting' then
    raise exception 'JAR_NOT_ACCEPTING';
  end if;

  if v_text = '' then
    raise exception 'EMPTY_PICKLE';
  end if;

  if char_length(v_text) > 1200 then
    raise exception 'PICKLE_TOO_LONG';
  end if;

  select count(*) into v_recent
  from public.pickle_authors
  where author_id = v_user
    and created_at > now() - interval '10 minutes';

  if v_recent >= max_per_ten_minutes then
    raise exception 'SLOW_DOWN';
  end if;

  insert into public.pickles (jar_id, text_content)
  values (p_jar_id, v_text)
  returning id into v_id;

  insert into public.pickle_authors (pickle_id, author_id)
  values (v_id, v_user);

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. How full is the jar?
-- ---------------------------------------------------------------------------
-- Members cannot read the pickles in an unopened jar, but the fullness
-- picture needs to know how many there are. This hands back exactly one
-- number for the whole jar — no rows, no ids, nothing per person.

create or replace function public.jar_pickle_count(p_jar_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.jars where id = p_jar_id;

  if not found or not public.is_group_member(v_group) then
    raise exception 'JAR_NOT_FOUND';
  end if;

  return (select count(*)::int from public.pickles where jar_id = p_jar_id);
end;
$$;


-- ---------------------------------------------------------------------------
-- 7. Permissions
-- ---------------------------------------------------------------------------

grant select on public.pickles        to authenticated;
grant select on public.pickle_authors to authenticated;
revoke all on public.pickles        from anon;
revoke all on public.pickle_authors from anon;

grant execute on function public.put_pickle(uuid, text)        to authenticated;
grant execute on function public.jar_pickle_count(uuid)        to authenticated;
grant execute on function public.can_read_jar_pickles(uuid)    to authenticated;

revoke execute on function public.put_pickle(uuid, text)       from public, anon;
revoke execute on function public.jar_pickle_count(uuid)       from public, anon;
revoke execute on function public.can_read_jar_pickles(uuid)   from public, anon;


-- ---------------------------------------------------------------------------
-- To undo this migration (for reference only — never needed in normal use):
--
--   drop function if exists public.jar_pickle_count(uuid);
--   drop function if exists public.put_pickle(uuid, text);
--   drop table if exists public.pickle_authors;
--   drop table if exists public.pickles;
--   drop function if exists public.can_read_jar_pickles(uuid);
-- ---------------------------------------------------------------------------
