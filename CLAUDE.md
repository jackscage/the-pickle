# CLAUDE.md — The Pickle

> **Starting a build session? Read `docs/BUILD_BRIEF.md` first.** It carries
> the current state, the ordered task list, and the design constraints for the
> work in progress. (The phases 6 & 7 brief there was completed on 4 Oct 2026;
> the next session needs a fresh one.) Note that documents under a `claude/`
> path referenced in older notes live in a claude.ai Project and are NOT in
> this repository.

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

    pickles         id, jar_id, text_content, drawing_url, revealed
    pickle_authors  pickle_id, author_id, created_at   <- RLS: only rows where author_id = auth.uid()

`pickles` has no author column. There is nothing to leak. Never add one, never
join authorship into a query that serves ordinary members, and never "just for
now" put an author id in a response.

`pickles` also has **no timestamp**, on purpose (decided 4 Oct 2026, a
deliberate change from the spec's schema). Members can read every opened
pickle, so an exact submission time would let them match a pickle to whoever
was on their phone at that moment. The time lives in `pickle_authors`, where
only the author can see it, and opened pickles are shown sorted by their
random id, never by time. Don't add a time back, and don't order by one.

This is built (migration 0003) and guarded by `tests/anonymity.spec.ts` — the
no-author-leakage test, at both the database and the browser level. It has
been proven to fail when either key security rule is deliberately broken. If
it ever fails, stop: do not ship, and do not "fix" the test.

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

## Working locally, testing, and the two databases

Since 4 Oct 2026 the build runs locally: `npm install`, `npm run build` and
`npm test` all work, and `package-lock.json` is committed so every deploy
installs exactly the versions that were tested. Run the build and the tests
before every commit; keep commits small.

**Two Supabase projects:**

| Project | What it is |
| --- | --- |
| `the-real-pickle` (ref `jcbcisuffkkftrskcimt`) | **Live.** Real people's data. |
| `the-pickle-test` (ref `jhufmtsuxmdecmfpatzx`) | **Tests only.** Pretend people, created and deleted by the tests. |

`npm test` reads `.env.test.local` (gitignored, holds the test project's
keys) and refuses to run if it is ever pointed at the live project. It starts
its own copies of the app on ports 3100 and 3101 (the second with every
optional feature switched off), so it never reuses an `npm run dev` that is
talking to live. Free Supabase projects pause after about a week unused — if
tests suddenly cannot reach the database, un-pause `the-pickle-test`.

**A database change goes:** write the numbered migration → apply it to the
test project → `npm test` green → explain to Jacks in plain words what it
changes on live → **ask** → apply to live → verify (existing data unchanged,
structure matches test). Never apply to live without asking, every time. A
migration must be live *before* code that depends on it is pushed.

**Pushing:** this terminal has no GitHub login. Commit locally; Jacks pushes
with GitHub Desktop ("Push origin"), which deploys to Vercel. Tell him how
many commits to expect. A push needs no summary or description.

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

## Where things stand (end of session 6, 4 Oct 2026)

Phases 1 through 7 are built, tested and live: foundation, accounts,
profiles, Pickle Groups, roster, **jars, and pickles with the split-table
anonymity schema**. Also live: a temporary Feedback Module for testers. The
next phase in PROJECT_SPEC.md §27 is step 8 onward; see the build journal for
what step 8's seal/open work already covers.

`SETUP.md` in this folder is the non-programmer's guide to getting it running:
GitHub Desktop, the Supabase SQL, the auth URL settings, and Vercel. It is
also the checklist to re-read if something stops working.

Database changes go in `supabase/migrations/`, numbered, never edited after
they have been run:

| File | What it adds |
| --- | --- |
| `0001_accounts_groups_roster.sql` | profiles, pickle_groups, group_members |
| `0002_jars.sql` | jars; each group's "how new jars start" setting |
| `0003_pickles_and_anonymous_authorship.sql` | pickles + pickle_authors, together |
| `0004_feedback.sql` | the temporary feedback tables (drop statements at the bottom) |
| `0005_advisor_fixes.sql` | small hardening flagged by Supabase's advisor |

### Rules established so far, worth keeping

**The roster query touches group_members and profiles, and nothing else.**
`src/lib/groups.ts` carries the long version of why. When the pickles tables
arrive, they do not get joined in here — not as a count, not as a flag, not
"for later".

**Rules live in database functions, not in the app.** The 75-member cap, the
locked check and the last-admin rule are all inside `join_pickle_group` and
`leave_pickle_group`. The app calls those functions rather than writing to
tables directly, so the rules hold no matter what calls them. Keep it that way.
The same goes for jars (`start_jar`, `seal_jar`, `open_jar`, `rename_jar`) and
pickles (`put_pickle`): there is no policy letting anyone, admins included,
write to those tables directly. The function is the only door.

**`src/lib/pickles.ts` is where anonymity is easiest to break.** Its header
carries the rules: named columns only, nothing joined onto a pickle, and the
one permitted read of `pickle_authors` (the viewer's own rows, turned into
"You wrote this" on the server). The fullness picture gets a single number
from `jar_pickle_count`, which picks a stage on the server; the count itself
never reaches the browser.

**Jars:** at most one current jar per group, enforced by the database. Each
group chooses (and admins can change) whether an admin starts each jar or a
new one starts automatically when the last is opened. Fullness always means
fullness — it is a pure function in `src/lib/fullness.ts`, with the tunable
multipliers in one named constant.

**Feedback Module (`src/feedback/`) is temporary and built to be removed.**
Everything lives in that folder (including its own copy and tests), with
exactly two touch points: the `<FeedbackButton />` lines in
`src/app/layout.tsx` and `src/app/feedback/page.tsx`. Keep it that way — don't
import from it anywhere else. Its switch is `NEXT_PUBLIC_FEEDBACK_ENABLED`
(off unless `"true"`; on in Vercel production). Feedback is attributed but
records screens only — never pickle content, ids or authorship. Removal steps:
`src/feedback/README.md`.

### Copy

Every user-facing sentence is in `src/lib/copy.ts`, including the friendly
version of each database error. The Design Stage (spec §17a) should be a pass
over that one file rather than a hunt through components. (The one exception
is the removable Feedback Module, whose words live in `src/feedback/copy.ts`
so they delete with it.)

Errors travel between screens as short keys (`?error=NOT_ADMIN`) that pages
translate with `groupErrorMessage`, never as sentences — so a crafted link can
only ever show one of the app's own messages.

**The Explanation Rule:** a screen explains itself once, in one sentence, and
only where genuinely counter-intuitive. The product never names its vendors,
its build status, or its developer. Technical detail for maintainers goes to
the server log, not the screen.
