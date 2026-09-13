# CLAUDE.md — The Pickle

Rules of the house. Read before doing anything in this repository.

## What this is

A private, invite-only web app where a friend group anonymously submits
jokes, notes and drawings into a shared "jar," which is opened at a
deliberately chosen moment and revealed all at once. It recreates a real
summer-camp tradition. The pacing and the ceremony are the product — this is
not a feed, and it should never become one.

## Who you are working for

Jacks is not a programmer. Every explanation, code comment and terminal
instruction should assume no coding knowledge. The documentation is not
overhead on this project — reviewing it afterwards is how he learns what was
built, so it is a deliverable in its own right.

When something is ambiguous or seems to conflict with good practice, ask
rather than guess. He would much rather answer a question than discover a
silent assumption later.

## The one rule that cannot be broken

**Anonymity is a security property, not a UI convenience.**

Row-Level Security filters rows, not columns. A member who is allowed to see
a pickle row would receive `author_id` inside it no matter what the interface
displayed. So the schema splits:

    pickles         id, jar_id, text_content, drawing_url, revealed, created_at
    pickle_authors  pickle_id, author_id     <- RLS: only rows where author_id = auth.uid()

`pickles` has no author column. There is nothing to leak. Never add one, never
join authorship into a query that serves ordinary members, and never "just for
now" put an author id in a response.

The single exception is the gated moderation path: server-side only, using the
service role key, only in the context of a specific report, always written to
the audit log.

Any change that would weaken this stops and asks. It is not a tradeoff to make
independently.

## Vocabulary

Use these words in UI copy, comments and variable names. Never "post," "feed,"
or "group chat."

| Generic | The Pickle |
| --- | --- |
| Group | Pickle Group |
| Join code | Pickle Code |
| A submission | Pickle |
| A round | Jar |
| Archive | Past Jars |
| Submitting | "Put It In The Pickle" |
| Publishing a round | "Open The Jar" |
| Freezing submissions | "Seal the Jar" |

## Stack

Next.js (App Router) + TypeScript + Tailwind, on Vercel. Supabase for
database, auth and file storage. Playwright for end-to-end tests.

Interface text is Nunito. The text inside a pickle is Caveat — handwriting,
used only for pickle content and never for interface chrome. That contrast is
what makes a pickle read as a scribbled note instead of a text post.

## Environment constraint worth knowing

The package registry is blocked in the Claude session that builds this, so
`npm install` cannot run there. Dependencies are resolved by Vercel at build
time instead. Practical consequences:

- `package.json` is hand-maintained. Check version ranges carefully.
- There is no lockfile committed yet. Vercel resolves on each build.
- The Vercel build log is the typecheck and compile feedback loop.
- Prefer small, verifiable commits — a broken build is discovered at deploy,
  not before it.

## Where the documents live

The specification lives in Google Drive, in a folder called "The Pickle":

- `PROJECT_SPEC.md` — the master product and technical spec, 28 sections
- `BUILD_JOURNAL.md` — running history; add an entry at the end of any
  session where a real decision is made
- `GLOSSARY.md` — plain-English reference written for a non-programmer
- `TECHNICAL_RESEARCH.md` — research findings with sources
- `SESSION_04_DECISIONS.md` — decisions and pending spec amendments

Update the build journal after each phase with what was built, anything that
deviated from the spec and why, and anything the project owner should know in
plain English.

## Build order

Follow the phases in PROJECT_SPEC.md section 27, in order. Do not skip ahead
past step 7 before the anonymous identity system is implemented and tested —
everything after it depends on that foundation being correct.

Step 7 builds pickles and the split-table schema **together**, deliberately.
Building a pickles table first and adding anonymity afterwards invites
creating that table with an author column and migrating it later. There must
never be a commit in this history where a pickle carries its author in the
same row.

## Keep style separable from logic

A later Design Stage (PROJECT_SPEC.md section 17a) replaces the placeholder
aesthetic choices — the preset reaction emoji, the jar artwork, the fullness
multipliers — with considered ones, using playtester input. Build so those can
be swapped without rewriting behavior: keep artwork, copy, and tunable numbers
out of the logic that uses them.

## Where things stand (end of session 5)

Phases 1 through 5 are written: foundation, accounts, profiles, Pickle Groups,
roster. Phase 6 (jars) is next, then phase 7 (pickles + the split-table
anonymity schema, built together — see above).

`SETUP.md` in this folder is the non-programmer's guide to getting it running:
GitHub Desktop, the Supabase SQL, the auth URL settings, and Vercel. It is
also the checklist to re-read if something stops working.

Database changes go in `supabase/migrations/`, numbered, never edited after
they have been run. `0001_accounts_groups_roster.sql` creates profiles,
pickle_groups and group_members. It deliberately creates nothing about
pickles.

### Two rules this phase established, worth keeping

**The roster query touches group_members and profiles, and nothing else.**
`src/lib/groups.ts` carries the long version of why. When the pickles tables
arrive, they do not get joined in here — not as a count, not as a flag, not
"for later".

**Rules live in database functions, not in the app.** The 75-member cap, the
locked check and the last-admin rule are all inside `join_pickle_group` and
`leave_pickle_group`. The app calls those functions rather than writing to
tables directly, so the rules hold no matter what calls them. Keep it that way.

### Copy

Every user-facing sentence is in `src/lib/copy.ts`, including the friendly
version of each database error. The Design Stage (spec §17a) should be a pass
over that one file rather than a hunt through components.
