# Supabase

The database, sign-in and file storage all live in one Supabase project,
`the-real-pickle`.

## Migrations

Numbered SQL files in `migrations/`. They are run by hand, in order, by
pasting them into the SQL Editor in the Supabase dashboard — the build
session has no network route to the database, so there is no automated
migration step and there will not be one for a while.

**A migration that has been run is never edited.** If something needs
changing, the change is a new numbered file. Editing one that has already
run means the file in the repository no longer describes the database that
actually exists, which is the one thing this folder is for.

| File | What it does | Status |
| --- | --- | --- |
| `0001_accounts_groups_roster.sql` | profiles, pickle_groups, group_members, their RLS policies, Pickle Code generation, and the create/join/leave/regenerate functions | run 13 Sep 2026 |

Every migration is written to be safe to run twice — policies are dropped and
recreated, tables use `create table if not exists`. Note that Supabase's SQL
Editor shows a "destructive operations" warning for any script containing
`drop` or `revoke`, including these. That warning is a keyword scan, not an
analysis; read the script rather than the warning.

## The shape of the schema, and why

    profiles        id, display_name, avatar_url, tagline
    pickle_groups   id, name, pickle_code, created_by, locked, member_cap, admin_mode
    group_members   group_id, user_id, is_admin, joined_at

Arriving in a later phase, and the reason the whole project exists:

    pickles         id, jar_id, text_content, drawing_url, revealed, created_at
    pickle_authors  pickle_id, author_id

`pickles` carries no author column. `pickle_authors` gets a Row-Level Security
policy returning only rows where `author_id = auth.uid()`, which is what makes
"you wrote this" work for the author and returns nothing for anyone else.

Row-Level Security filters rows, not columns — so keeping the author id in a
separate table is not a stylistic preference. It is the difference between a
promise the database enforces and a promise the interface merely displays.

Those two tables must be created in the **same** migration, per section 27 of
the spec. There must never be a commit in this repository's history where a
pickle carries its author in the same row.

## Two patterns worth copying into later migrations

**Rules live in functions, not in the app.** The 75-member cap, the locked
check and the "a group must never have zero admins" rule are all inside
`join_pickle_group` and `leave_pickle_group`. There is deliberately no insert
policy on `group_members` or `pickle_groups`, so those functions are the only
way a row gets created. A rule enforced in the app holds only as long as every
screen remembers it; a rule enforced here holds regardless.

**Helper functions break RLS recursion.** A policy on `group_members` saying
"you may read rows of groups you belong to" has to consult `group_members` to
answer, which triggers the same policy again, forever. `is_group_member`,
`is_group_admin` and `shares_group_with` are marked `security definer` so they
run with the table's own privileges and skip the policies, which breaks the
loop. Any future policy that needs to ask "is this person in this group" should
call those rather than query the table directly.

## Things configured in the dashboard, not in these files

These are worth knowing about because nothing in the repository records them,
so a fresh Supabase project would silently lack them:

- **Authentication → URL Configuration.** Site URL and the redirect allow-list.
  Sign-in emails go out fine without this, but the links in them do not work.
- **Authentication → Providers → Email.** Enabled by default.
- **Storage → the `avatars` bucket.** Created by `0001`, but if the storage
  policy section of that migration failed on a permissions error, the bucket
  exists while its access rules do not.
