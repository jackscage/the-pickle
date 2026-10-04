import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading jars (migration 0002).
 *
 * Reading only. Every change to a jar — starting, naming, sealing, opening —
 * goes through a database function in src/lib/actions/jars.ts, because the
 * database refuses direct writes to this table from anyone.
 *
 * Nothing here reads pickles or who wrote them. When pickles arrive in
 * phase 7, the count that feeds the fullness picture comes from its own
 * function that returns a single number — never from a query that could
 * carry rows, let alone authors.
 */

export type JarStatus = "accepting" | "sealed" | "opened";

export type Jar = {
  id: string;
  groupId: string;
  name: string | null;
  status: JarStatus;
  createdAt: string;
  sealedAt: string | null;
  openedAt: string | null;
};

type JarRow = {
  id: string;
  group_id: string;
  name: string | null;
  status: JarStatus;
  created_at: string;
  sealed_at: string | null;
  opened_at: string | null;
};

// Deliberately not opens_at or timer_visible. Timed jars are not built, and
// when they are, a hidden timer must not travel to members' browsers at all
// (see the warning in migration 0002).
const JAR_COLUMNS = "id, group_id, name, status, created_at, sealed_at, opened_at";

function toJar(row: JarRow): Jar {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    sealedAt: row.sealed_at,
    openedAt: row.opened_at,
  };
}

/** The group's accepting-or-sealed jar, or null if it has none right now. */
export async function getCurrentJar(groupId: string): Promise<Jar | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jars")
    .select(JAR_COLUMNS)
    .eq("group_id", groupId)
    .neq("status", "opened")
    .maybeSingle();

  return data ? toJar(data as JarRow) : null;
}

/** Past Jars: every opened jar in the group, most recently opened first. */
export async function listPastJars(groupId: string): Promise<Jar[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jars")
    .select(JAR_COLUMNS)
    .eq("group_id", groupId)
    .eq("status", "opened")
    .order("opened_at", { ascending: false });

  return ((data ?? []) as JarRow[]).map(toJar);
}

/**
 * One jar, checked to belong to the group in the address. A 404 if it is not
 * there or the person cannot see it — the two look identical from outside.
 */
export async function getJar(groupId: string, jarId: string): Promise<Jar> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jars")
    .select(JAR_COLUMNS)
    .eq("id", jarId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!data) notFound();
  return toJar(data as JarRow);
}

/** "4 October 2026". The format is a Design Stage decision, so it is here. */
export function formatJarDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
