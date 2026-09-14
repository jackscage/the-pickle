-- ============================================================================
-- The Pickle — "is the database actually set up?" check
--
-- Paste the whole thing into Supabase's SQL Editor and press Run.
-- It only READS. It changes nothing, and it will not trigger the
-- "destructive operations" warning.
--
-- You get back six rows. What each one should say is in the table below.
-- Anything that says MISSING or a number lower than expected means a piece of
-- migration 0001 did not take.
-- ============================================================================

select 'tables' as check_name,
       coalesce(string_agg(table_name, ', ' order by table_name), 'MISSING') as result,
       'expect: group_members, pickle_groups, profiles' as expected
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'pickle_groups', 'group_members')

union all
select 'row-level security on',
       coalesce(string_agg(tablename, ', ' order by tablename), 'NONE — SERIOUS'),
       'expect: all three tables listed'
from pg_tables
where schemaname = 'public'
  and rowsecurity
  and tablename in ('profiles', 'pickle_groups', 'group_members')

union all
select 'security policies',
       count(*)::text,
       'expect: 8'
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'pickle_groups', 'group_members')

union all
select 'database functions',
       count(*)::text,
       'expect: 10'
from information_schema.routines
where routine_schema = 'public'

union all
select 'avatars storage bucket',
       coalesce((select id from storage.buckets where id = 'avatars'), 'MISSING'),
       'expect: avatars'

union all
select 'avatar storage policies',
       count(*)::text,
       'expect: 4 — this is the part most likely to have failed'
from pg_policies
where tablename = 'objects'
  and policyname like 'avatars%';


-- ============================================================================
-- What each row is actually checking
--
-- tables
--     The three tables migration 0001 creates. profiles holds your display
--     name, picture and tagline. pickle_groups holds a group and its code.
--     group_members says who is in which group -- that table IS the roster.
--
-- row-level security on
--     Whether the tables are protected. With this off, anyone holding the
--     app's public key could read every row in them. This is the single most
--     important line in this file. If any table is missing here, stop and fix
--     it before letting anyone else use the app.
--
-- security policies
--     The specific rules, once protection is on. With protection on and no
--     policies, the tables hand back nothing at all -- which fails safe, but
--     also means the app appears completely broken.
--     Expected: profiles 3, pickle_groups 2, group_members 3.
--
-- database functions
--     The small programs living inside the database. Four of them are the
--     only way to create or join a group, which is how the 75-member cap and
--     the locked-group check are enforced somewhere the app cannot bypass.
--     Three are helpers the security policies call. The rest are plumbing.
--
-- avatars storage bucket
--     Where profile pictures are kept.
--
-- avatar storage policies
--     The rules saying you may only write into your own folder. This is the
--     section of 0001 most likely to have failed, because Supabase sometimes
--     refuses policy changes on its storage tables from the SQL Editor. If
--     this says 0, the symptom is that profile pictures will not upload,
--     while everything else works normally.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A note on what a query like this can and cannot tell you
--
-- This checks that the *structures* exist. It does not prove the app works.
-- The far better test is the one you can do in a browser in two minutes:
-- sign in, set a display name, create a group, and have someone else join it
-- with the code. If that works, everything above is true and working
-- together, which no query can demonstrate on its own.
--
-- Run this when something is behaving oddly and you want to know whether the
-- database is the reason. Do not run it instead of using the app.
-- ----------------------------------------------------------------------------
