# Build Brief — Phases 6 & 7, plus the Feedback Module

**Written 4 Oct 2026. Self-contained — everything you need is in this file
plus `CLAUDE.md` plus `supabase/migrations/`.**

> If you were told to read `claude/PROJECT_STATE.md` or
> `claude/NEXT_SESSION.md`: those live in a claude.ai Project, not in this
> repository, and you cannot read them. Nothing is missing — their relevant
> contents are reproduced below.

**Goal:** a complete working rough draft. A jar can be made, filled, sealed
and opened; a pickle can be submitted and revealed anonymously. It does not
need to look good. It needs to work.

---

## Where the project actually stands (verified 3 Oct 2026)

Phases 1–5 are built, deployed, and **used by two real people**. The live
database holds 2 accounts, 2 profiles, 1 Pickle Group, 2 memberships and 2
uploaded profile pictures. Sign-in, profiles, group creation, joining by code
and the roster all work in production.

- Live at `https://the-pickle-hazel.vercel.app`
- Supabase project `the-real-pickle`, Postgres 17, healthy
- `supabase/migrations/0001_accounts_groups_roster.sql` is applied and intact.
  RLS is on for all three tables, policy counts 3 / 2 / 3.
- **Phase 6 (jars) is next. Phase 7 (pickles + anonymity) after it.**

### What is new in this session, and why it matters

This is the first session with a **local build**. Until now, code was written
and pushed without ever being run — the first execution of any line was in
production. Four bugs reached the live site that way.

- `.env.local` exists (written 4 Oct). `npm run dev` should work.
- `npm install` works here. It did not work in any previous environment.
- **There is still no lockfile.** Creating it is task 1.

---

## Before you write any feature code

1. **`npm install`, then commit `package-lock.json`.** This is the single most
   valuable thing in this session. Dependency versions are currently
   re-resolved on every deploy, so a library can shift silently between builds.
2. **`npm run build`** and confirm green. If red, fix that first — a red build
   means `main` is broken for everyone.
3. One file may be modified and uncommitted: `src/app/api/health/route.ts`.
   Leave it; it goes out with this session's work.

---

## Task list, in order

| # | Task | Notes |
| --- | --- | --- |
| 1 | `npm install`, commit lockfile | Do first. |
| 2 | Local build green | |
| 3 | Set up Playwright | Needed for task 9. |
| 4 | Migration 0002 — jars | See Phase 6 below |
| 5 | Jar UI — create, view, seal, open, Past Jars | |
| 6 | Migration 0003 — pickles + pickle_authors **together** | Non-negotiable |
| 7 | Submit flow — "Put It In The Pickle" | Text only |
| 8 | Reveal flow — "Open The Jar" | |
| 9 | **The no-author-leakage test** | Do not skip |
| 10 | Migration 0004 + Feedback Module | Design below |
| 11 | Fix database advisor findings | See below |
| 12 | Update `CLAUDE.md` if a working rule changed | |

**If time runs short, stop after task 9.** Do not start Phase 7 and leave it
half-built — a half-finished anonymity schema is the one state worse than not
starting.

---

## Phase 6 — Jars

- States `accepting` → `sealed` → `opened`. Sealed is optional to use but must
  exist. **Opening is irreversible and needs explicit confirmation.**
- One current jar per group. Opened jars become Past Jars.
- **Sealing and opening go through database functions**, exactly like
  `join_pickle_group` in migration 0001. There must be no insert/update policy
  letting the app change jar state directly. The function is the only door.
- Fullness is a **pure function of `(pickleCount, memberCount)`**. Write it
  now, feed it zero, and let Phase 7 wire up the real count. Put the
  multipliers in named constants in one obvious place — they are a guess
  awaiting human judgement.
- **Fullness always means fullness.** No branch anywhere makes it mean
  anything else. (This corrects an earlier spec version which said a timed
  jar's fullness would show a countdown instead. It will not.)
- **Do not build timed jars.** But include `opens_at` (nullable, timestamptz)
  and `timer_visible` (boolean) columns so it is designed for rather than
  retrofitted. Settled: a timer is **per jar**, and the admin chooses whether
  members see it.

---

## Phase 7 — Pickles and anonymity

**This is the phase the product exists for. Read the standing note at the top
of `src/lib/groups.ts` before starting.**

Both tables in **one** migration:

    pickles         id, jar_id, text_content, drawing_url, revealed, created_at
    pickle_authors  pickle_id, author_id

Non-negotiable:

- `pickles` has **no author column**. Not temporarily. Not "to migrate later."
- No commit may ever exist in which a pickle carries its author in the same
  row. That is why both tables share one migration.
- `pickle_authors` gets an RLS policy returning only `author_id = auth.uid()`.
- Never join `pickle_authors` into a query serving ordinary members.
- The roster query touches `group_members` and `profiles` and nothing else.
  Not a count, not a flag, not "for later".

Text only. Drawings are a later phase.

### Task 9 — the test that must exist

Write it alongside the code, not after. It asserts:

1. The `pickles` table has no author column.
2. No unrevealed pickle exposes an author id in any network response, on any
   screen.
3. No profile name or picture appears in a payload alongside an unrevealed
   pickle.
4. The roster response contains nothing derived from `pickle_authors`.

This is the product's one non-negotiable guarantee. Until this session it had
nowhere to live. With Playwright installed it does.

---

## Task 10 — The Feedback Module

**The project owner's requirement, in his words:** testers leave feedback from
the specific areas and screens they are on; it all collects into one pool he
and his board can read; and *"I want to build it out so I can easily get rid
of all of those feedback screens once the App is public for real."*

That last clause is the design constraint. Removal must be trivial and
obviously complete.

### The rules

**1. One folder.** Everything lives in `src/feedback/` — queries, button,
form, admin pool screen, copy. Deleting that folder removes the feature.

**2. Exactly two touch points outside the folder:**
- One import in the app layout rendering `<FeedbackButton />`
- One route folder for the admin pool screen

Both are one-line deletions. A project-wide search for `feedback` should
return the folder plus exactly these two places and nothing else.

**3. One flag.** A single constant `FEEDBACK_ENABLED`, read from
`NEXT_PUBLIC_FEEDBACK_ENABLED` with a safe default, gates every piece of UI.
**Test that setting it false actually hides everything**, including the admin
route, before calling this done.

**4. One migration to add, one to drop.** Migration 0004 creates the table.
Write the matching `DROP` statements as a comment at the bottom of that same
file so whoever removes it later does not have to work it out.

**5. Leave a removal note.** `src/feedback/README.md`, four lines: delete this
folder, delete these two touch points, run the drop statements, remove the env
var. Written for someone who has never seen this codebase.

### What it captures

Automatically, without the tester typing it: which screen they were on, the
group and jar if relevant, their account, the timestamp, and a type
(bug / suggestion / confusion). Then **one free-text box — one box, not a
form.** Every extra field reduces how many reports you get.

### The admin pool

One screen, admin-only, newest first, with context attached. Filterable by
type at minimum. This goes to a board, so it must be readable by someone who
has not used the app.

### Anonymity note — read before writing the table

Feedback is **attributed**, not anonymous. It carries `user_id` so the owner
can follow up. That is correct and intended.

**But it must never become a side channel that de-anonymises a pickle.** A
feedback row records the *screen*, never the content of a pickle and never a
pickle id tied to its author. Keep `pickle_authors` out of every feedback
query.

---

## Task 11 — Database advisor fixes

Run against the live database on 3 Oct. All minor; fold into a migration.

- `touch_updated_at` and `normalise_pickle_code` lack `SET search_path`. The
  three SECURITY DEFINER helpers have it; these two were missed.
- The three RLS policies on `profiles` call `auth.uid()` once per row. Wrap as
  `(select auth.uid())` so it evaluates once per query.
- `pickle_groups.created_by` has a foreign key with no covering index.

---

## Standing rules for everything built tonight

- **The Explanation Rule.** A screen explains itself once, in one sentence,
  and only where genuinely counter-intuitive. **The product never names its
  own vendors, its build status, or its developer.** Three existing violations
  are in `src/lib/copy.ts` (a message naming Supabase, one giving dashboard
  instructions, one announcing what has not been built yet). Do not add a
  fourth; fix them if you touch that file.
- **All user-facing text goes in `src/lib/copy.ts`.** No exceptions.
- **Vocabulary:** Pickle Group, Pickle Code, Pickle, Jar, Past Jars, "Put It
  In The Pickle", "Open The Jar", "Seal the Jar", The Roster. Never post,
  feed, or group chat.
- **Rules live in database functions**, not in screens.
- **Small commits.** A broken build with two changed files is a two-minute
  fix; with forty it is an evening.
- **Migrations are numbered and never edited after they have been run.**
- The project owner is not a programmer. Explanations assume no coding
  knowledge, and the documentation is a deliverable rather than overhead.
