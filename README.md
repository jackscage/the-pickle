# The Pickle

A jar that fills up, gets sealed, and opens all at once. For your people only.

## What it is

At a summer camp, campers submitted anonymous notes to a box called "the
Cucumber," read aloud at campfire after the adults had filtered them. The
material judged too inappropriate for the kids didn't get thrown away — it
went into a second box, "the Pickle," read very late at night among the staff
only. It became the best part of camp: anonymous, sharp, usually at a friend's
expense, and revealed all at once in a room full of people.

This is that, as software.

## Status

**Phase 1 — Foundation.** The app builds, deploys, and can see its Supabase
configuration. There is no database schema yet and nothing to submit to. The
placeholder page and `/api/health` exist to prove the pipeline works end to
end before anything is built on top of it.

## Running it locally

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the two NEXT_PUBLIC_ values
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example` for the full explanation of each one. The short version:
the two `NEXT_PUBLIC_` values are public by design and safe to commit to
Vercel's environment settings; `SUPABASE_SERVICE_ROLE_KEY` bypasses every
security policy in the database and must never appear in the browser, in a
commit, or in a chat.

## Documentation

The specification, build journal, glossary and research notes live in the
Google Drive folder "The Pickle." `CLAUDE.md` in this repository carries the
rules that matter most day to day.
