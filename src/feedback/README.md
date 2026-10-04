# Feedback Module — temporary, built to be removed

## How to remove it completely

1. Delete this folder: `src/feedback/` (its tests are inside it and go with it).
2. Delete the two touch points: the folder `src/app/feedback/`, and in `src/app/layout.tsx` the `import { FeedbackButton } …` line and the `<FeedbackButton />` line.
3. Run the three `drop` statements at the bottom of `supabase/migrations/0004_feedback.sql` in the Supabase SQL editor, on the live database (and the test one). Export the feedback first if anyone wants to keep it.
4. Remove `NEXT_PUBLIC_FEEDBACK_ENABLED` wherever it is set: Vercel's environment variables, `.env.local`, `.env.example`, and the two lines in `playwright.config.ts` that name it (one in each `OPTIONAL_FEATURES` list).

Then run `npm run build` and `npm test`. A project-wide search for "feedback" should find nothing outside the migration file and the documentation.

---

## Reference

**Switching it on or off.** `NEXT_PUBLIC_FEEDBACK_ENABLED=true` shows it; anything else hides every part of it, including the pool screen. For the live site, set it in Vercel → the project → Settings → Environment Variables, then redeploy.

**Who can read the pool** (`/feedback`). People on the `feedback_readers` list. Each needs an account in the app first. Then, in the Supabase SQL editor, with their sign-in email:

```sql
insert into public.feedback_readers (user_id)
select id from auth.users where email = 'their-email@example.com';
```

Remove someone by `delete from public.feedback_readers where user_id = (select id from auth.users where email = '…');`

**What it records.** The tester's account and display name, the type (bug / suggestion / confusing), their message, the screen they were on in plain words, and the group and jar names on that screen. Never a pickle's content, a pickle id, or anything about who wrote a pickle — the table has no column for any of those, and a test in this folder checks the module's code never reads pickle tables.
