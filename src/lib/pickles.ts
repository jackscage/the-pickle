import { createClient } from "@/lib/supabase/server";

/**
 * Reading pickles (migration 0003).
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE CHANGING ANYTHING HERE (PROJECT_SPEC.md section 9)
 * ---------------------------------------------------------------------------
 * A pickle is anonymous, and this file is where that is easiest to break.
 *
 * - `pickles` has no author column. Never select anything from another table
 *   alongside it — no profiles, no pickle_authors, no "embedded" relations.
 * - The ONE use of pickle_authors in the app is `whichAreMine`: the viewer
 *   asking which pickles they themselves wrote. The database only ever
 *   returns the viewer's own rows, and this file turns them into true/false
 *   before anything leaves the server. No author id reaches a browser.
 * - Pickles are sorted by their random id, never by time, so their order
 *   says nothing about who put them in when.
 *
 * Everything here runs on the server. The browser receives finished HTML
 * with the words of each pickle and, for the viewer's own, a "You wrote
 * this" label — and nothing else.
 * ---------------------------------------------------------------------------
 */

export type OpenedPickle = {
  id: string;
  text: string;
  /** True only for the person looking. Never says anything about others. */
  isMine: boolean;
};

/**
 * How many pickles are in a jar, for the fullness picture. One number from a
 * database function that returns nothing else. The number is turned into a
 * stage ("half full") on the server and never sent to the browser itself.
 */
export async function countPickles(jarId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("jar_pickle_count", { p_jar_id: jarId });
  if (error || typeof data !== "number") return 0;
  return data;
}

/** The pickles in an opened jar, in an order that reveals nothing. */
export async function listOpenedPickles(jarId: string): Promise<OpenedPickle[]> {
  const supabase = await createClient();

  // Named columns, never "*", and nothing joined on.
  const { data } = await supabase
    .from("pickles")
    .select("id, text_content")
    .eq("jar_id", jarId)
    .order("id");

  const rows = (data ?? []) as Array<{ id: string; text_content: string | null }>;
  const mine = await whichAreMine(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    text: row.text_content ?? "",
    isMine: mine.has(row.id),
  }));
}

/**
 * Of these pickles, which did the person looking write?
 *
 * The database's rule on pickle_authors returns only the viewer's own rows,
 * whatever is asked for — so this can never learn anything about anyone
 * else. Only pickle ids come back out of this function, never author ids.
 */
async function whichAreMine(pickleIds: string[]): Promise<Set<string>> {
  if (pickleIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("pickle_authors")
    .select("pickle_id")
    .in("pickle_id", pickleIds);

  return new Set(((data ?? []) as Array<{ pickle_id: string }>).map((row) => row.pickle_id));
}
