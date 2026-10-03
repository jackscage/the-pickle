import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Deployment health check.
 *
 * Reports whether the running app can see its Supabase configuration and
 * whether the database answers. It never reveals a key's value and never
 * reports anything about a specific person.
 *
 * ---------------------------------------------------------------------------
 * A correction, and the reason this file is more careful than it looks
 * ---------------------------------------------------------------------------
 * The first version of this check asked the database for a row and called any
 * error "unreachable". That was wrong, and it produced a confident false
 * alarm: this endpoint is public, so the request arrives signed out, and a
 * signed-out request is *supposed* to be refused. The database was answering
 * perfectly and correctly saying no — and the health check reported the
 * database as unreachable.
 *
 * A health check that cries wolf is worse than none, because the next person
 * to read it goes looking for a problem that does not exist.
 *
 * So: a refusal is now read as proof the database is alive. What we are
 * actually testing is whether anything answers at all.
 * ---------------------------------------------------------------------------
 */
export const dynamic = "force-dynamic";

/** Postgres and PostgREST codes meaning "answered, and said no." */
const REFUSAL_CODES = new Set([
  "42501", // insufficient_privilege — the anon role has no grant. Expected.
  "PGRST301", // JWT / role issue at the API layer. Still an answer.
  "PGRST116", // no rows. Also an answer.
  "PGRST205", // "not in the schema cache" — see below. Expected, and the
  // reason this check spent three weeks reporting a false alarm.
]);

/**
 * Why PGRST205 is a refusal and not a fault.
 *
 * `pickle_groups` is deliberately invisible to signed-out visitors: migration
 * 0001 grants SELECT to `authenticated` only, and every policy on the table is
 * `to authenticated`. Verified against the live database on 3 Oct 2026 —
 * `has_table_privilege('anon', 'public.pickle_groups', 'SELECT')` is false.
 *
 * When a role has no privilege on a table, PostgREST does not say "permission
 * denied." It cannot see the table for that role at all, so it answers
 * "Could not find the table 'public.pickle_groups' in the schema cache"
 * (PGRST205). That message contains neither "permission denied" nor "does not
 * exist", so it fell through every pattern below and landed in the catch-all —
 * and this endpoint reported a perfectly healthy database as unreachable while
 * two people were signing in and using it.
 *
 * That is the same mistake as the first version of this file, made a second
 * time: a locked door read as an empty building. The general rule, now stated
 * where it cannot be missed — ANY STRUCTURED ANSWER IS PROOF OF LIFE. Only
 * silence means unreachable.
 */
const SCHEMA_CACHE_REFUSAL = /schema cache|could not find the table/i;

/**
 * Turn a database error into something a human can act on.
 *
 * Truncated, because an error message is not a place to dump a stack trace
 * into a public endpoint, and tagged with the code because the code is the
 * part you can search for.
 */
function describe(error: { code?: string | null; message?: string | null }): string {
  const code = error.code ?? "no-code";
  const message = (error.message ?? "no message").slice(0, 200);
  return `No usable answer from the database. [${code}] ${message}`;
}

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let database: "ok" | "unreachable" | "not-configured" = "not-configured";
  let detail = "Supabase environment variables are not set.";

  if (hasUrl && hasAnonKey) {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("pickle_groups")
        .select("id", { count: "exact", head: true });

      if (!error) {
        database = "ok";
        detail = "Answered.";
      } else if (
        REFUSAL_CODES.has(error.code ?? "") ||
        /permission denied|not authorized|JWT/i.test(error.message ?? "") ||
        SCHEMA_CACHE_REFUSAL.test(error.message ?? "")
      ) {
        // The expected answer for a signed-out request. The tables exist and
        // are protected — which is the correct state, not a fault.
        database = "ok";
        detail = "Answered. Anonymous access correctly refused.";
      } else if (/does not exist|relation .* does not exist/i.test(error.message ?? "")) {
        database = "unreachable";
        detail =
          "Connected, but the tables are missing — migration 0001 has not been run.";
      } else {
        // Say WHAT went wrong. The previous version reported only that
        // something had, which is the same amount of information as a
        // shrug and cost a review session an hour of guesswork.
        //
        // Safe to surface: PostgREST and Postgres error codes and messages
        // describe the request, never the credentials used to make it. No
        // key, token or personal data passes through here.
        database = "unreachable";
        detail = describe(error);
      }
    } catch {
      database = "unreachable";
      detail = "Could not reach the database at all.";
    }
  }

  return NextResponse.json({
    status: hasUrl && hasAnonKey && database === "ok" ? "ok" : "misconfigured",
    phase: "2-5 - accounts, profiles, groups, roster",
    supabase: {
      urlConfigured: hasUrl,
      anonKeyConfigured: hasAnonKey,
      serviceRoleConfigured: hasServiceRole,
      database,
      detail,
    },
    note:
      "This endpoint is public and signed out. 'Anonymous access correctly " +
      "refused' is the healthy answer, not a problem.",
    checkedAt: new Date().toISOString(),
  });
}
