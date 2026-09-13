# Getting this running — start to finish

Written for someone who does not write code. Nothing here needs a terminal.

There are four parts and they have to happen in this order, because each one
needs the last one to be done. Set aside about half an hour for the first
time. Afterwards, step 1 becomes a single click and the rest never repeats.

---

## Part 1 — Get the code onto GitHub

The code currently only exists on your Mac, in `Desktop/the-pickle`. GitHub is
where it needs to live, because that is what Vercel watches. When something
arrives on GitHub, Vercel builds it and puts it on the internet, automatically.

**One-time setup:**

1. Download GitHub Desktop from <https://desktop.github.com> and install it.
2. Open it and sign in with your GitHub account (the `jackscage` one).
3. Go to **File → Add Local Repository**, and choose your `Desktop/the-pickle`
   folder.
4. It will say the folder is not a repository yet and offer to **create a
   repository** there. Do that. Leave the name as `the-pickle`. Do not tick
   anything about a README or a licence — the folder already has what it needs.
5. In the top bar, click **Publish repository**.
   - Uncheck **Keep this code private** only if you want to; either is fine.
   - It will notice you already have a `jackscage/the-pickle` on GitHub. If it
     offers to push to it, say yes. If it refuses because the existing repo
     already has a commit in it, see the note at the bottom of this section.

**Every time after that:** when I've changed some files, open GitHub Desktop.
It will list what changed. Type a short line saying what it was in the box at
the bottom left, click **Commit to main**, then click **Push origin** at the
top. That's it. Vercel takes over from there.

> **If it refuses to publish because the repo isn't empty**
> The existing `jackscage/the-pickle` on GitHub has one commit in it with just
> a README. The simplest fix is to delete that repository on GitHub
> (Settings → scroll to the bottom → Delete this repository) and let GitHub
> Desktop create a fresh one with the same name. Nothing of value is in it.

---

## Part 2 — Set up the database

The app needs its tables before it can do anything. This is one copy-and-paste.

1. Go to <https://supabase.com/dashboard> and open the **the-real-pickle**
   project.
2. In the left sidebar, click **SQL Editor**, then **New query**.
3. Open the file `supabase/migrations/0001_accounts_groups_roster.sql` from
   your `the-pickle` folder — TextEdit will open it fine. Select all of it,
   copy it, and paste it into the SQL Editor box.
4. Click **Run**.

You should see **Success. No rows returned.** That is what success looks like
here — the script creates things rather than fetching them, so having nothing
to show is correct.

**If you get an error mentioning `storage.objects` or "must be owner":** the
first seven sections still worked. Only the profile-picture rules at the end
failed, and those can be added another way. Tell me the exact error and carry
on to Part 3 — everything except uploading a profile picture will work.

**To check it worked:** click **Table Editor** in the sidebar. You should see
`profiles`, `pickle_groups` and `group_members`, all empty.

---

## Part 3 — Tell Supabase where the app lives

Sign-in emails contain a link. Supabase will refuse to send people to an
address it doesn't recognise, so it needs to be told yours. Skip this and the
emails arrive but the links don't work, which is a confusing thing to debug.

Do this once you know your Vercel address (Part 4) — or come back to it.

1. In Supabase, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel address, e.g.
   `https://the-pickle.vercel.app`
3. Under **Redirect URLs**, click Add URL and add:
   - `https://the-pickle.vercel.app/**`
   - `https://*-jackscage.vercel.app/**` — this covers preview deployments,
     which get their own address each time
   - `http://localhost:3000/**` — harmless, and saves a trip back here later
4. Save.

While you're in Authentication, it's worth glancing at **Providers → Email**
and confirming **Enable email provider** is on. It is by default.

---

## Part 4 — Vercel

This is what puts the app on the internet and rebuilds it whenever you push.

**If you already have a Vercel project for this,** skip to step 4.

1. Go to <https://vercel.com> and sign in with GitHub.
2. Click **Add New → Project**.
3. Find `jackscage/the-pickle` in the list and click **Import**. Leave every
   setting at its default — Vercel recognises Next.js on its own.
4. Before deploying, open **Environment Variables** and add two:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://jcbcisuffkkftrskcimt.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *from Supabase → Project Settings → API → the `anon` / `publishable` key* |

   Add each to **all three** environments (Production, Preview, Development) —
   there's a set of tick boxes.

   Do **not** add the service role key. Nothing built so far uses it, and it
   bypasses every security rule in the database. It comes later, once there is
   a moderation screen that needs it.

5. Click **Deploy** and wait. Two or three minutes is normal for a first build.

**If the build fails,** open the failed deployment and copy the red text from
the build log. Paste it to me and I'll fix it. A first build failing is not
unusual and is usually one line.

---

## Part 5 — Does it work?

Open your Vercel address. You should get a sign-in screen with a jar on it.

Then walk through this. It's worth doing all of it, in order:

1. Put your email in and click **Send me a link**.
2. Check your email, click the link. You should land on "What should everyone
   call you?"
3. Give yourself a name. Add a picture and a tagline if you like — both are
   optional and both can be changed later.
4. You should land on **Your Pickle Groups**, empty.
5. Click **Start a group**, name it something, and make it. You should land on
   the group with a code shown in an orange box.
6. Copy the code. Send it to someone. Have them go to the same address, sign
   in with their own email, and use **Join with a code**.
7. You should both now see each other on the roster.

**The one thing to look at carefully:** the roster shows names, pictures,
taglines and who's an admin. It shows nothing about what anyone has put in a
jar — and it never will. That is the rule the whole app is built around
(spec §15a), and this is the first screen where you can actually check that it
is being kept.

Also worth a look: `your-address/api/health`. It should say `"status": "ok"`
and `"database": "ok"`. If it says `"unreachable"`, Part 2 didn't take.

---

## What isn't here yet

Deliberately, so you're not hunting for it:

- **Putting anything in a jar.** The jar on the group screen is a drawing. The
  jar itself is the next phase, and pickles the one after that.
- **Sealing and opening.** Same reason.
- **Removing members, locking a group, the moderation queue.** These arrive
  with the jar, because most of them are about things in a jar.

The group settings screen only offers what actually works. I'd rather it look
sparse than have buttons that teach you they do nothing.
