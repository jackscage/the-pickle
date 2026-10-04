-- ============================================================================
-- The Pickle — migration 0005
-- Tidy-ups flagged by Supabase's database advisor (build brief task 11).
--
-- READ THIS IF YOU ARE NOT A PROGRAMMER
-- -------------------------------------
-- Supabase runs automatic checks on the database and lists anything worth
-- improving. None of these were holes anyone was using; they are the
-- database equivalent of tightening screws that were finger-tight. Nothing
-- here changes what anyone can see or do in the app.
--
-- Safe to run more than once.
-- ============================================================================


-- 1. Two functions were missing the `search_path` setting every other
--    function has. It pins down where the function looks up the things it
--    names, so it cannot be tricked into using an impostor of the same name.

alter function public.touch_updated_at()          set search_path = public, pg_temp;
alter function public.normalise_pickle_code(text) set search_path = public, pg_temp;


-- 2. The three rules on profiles asked "who is signed in?" once for every
--    row they looked at. Wrapping it as `(select auth.uid())` asks once per
--    request instead. Same rule, same answer, less work.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_group_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


-- 3. pickle_groups.created_by points at an account but had no index, which
--    makes deleting an account slower than it needs to be.

create index if not exists pickle_groups_created_by_idx
  on public.pickle_groups (created_by);


-- 4. Six functions from migration 0001 could be CALLED by signed-out
--    visitors. Each already refused them from the inside (they check who is
--    signed in first), so nothing leaked — but the door should not open at
--    all. Postgres lets everyone call a new function unless told otherwise;
--    0001 granted signed-in users explicitly but never took the default
--    away. Signed-in users keep exactly the access they had.

revoke execute on function public.is_group_member(uuid)        from public, anon;
revoke execute on function public.is_group_admin(uuid)         from public, anon;
revoke execute on function public.shares_group_with(uuid)      from public, anon;
revoke execute on function public.join_pickle_group(text)      from public, anon;
revoke execute on function public.leave_pickle_group(uuid)     from public, anon;
revoke execute on function public.regenerate_pickle_code(uuid) from public, anon;
