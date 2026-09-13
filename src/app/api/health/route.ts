import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Deployment health check.
 *
 * Reports whether the running app can see its Supabase configuration, and —
 * as of phase 2 — whether the database actually answers. It never reveals a
 * key's value, and it never reports anything about a specific person.
 *
 * The database check reads the count of Pickle Groups the *caller* is allowed
 * to see, which for an unauthenticated request is zero. A zero is a healthy
 * answer here; what we are checking is that the query returned at all.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let database: "ok" | "unreachable" | "not-configured" = "not-configured";

  if (hasUrl && hasAnonKey) {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("pickle_groups")
        .select("id", { count: "exact", head: true });
      database = error ? "unreachable" : "ok";
    } catch {
      database = "unreachable";
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
    },
    checkedAt: new Date().toISOString(),
  });
}
