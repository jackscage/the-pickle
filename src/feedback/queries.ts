import { createClient } from "@/lib/supabase/server";

/**
 * Reading the feedback pool.
 *
 * The database decides who may read it (the feedback_readers list, migration
 * 0004). For anyone else these return nothing.
 *
 * ANONYMITY: reads the feedback table only. Never pickles, never
 * pickle_authors.
 */

export type FeedbackKind = "bug" | "suggestion" | "confusion";

export type FeedbackItem = {
  id: string;
  kind: FeedbackKind;
  message: string;
  reporterName: string | null;
  screenName: string;
  screenPath: string;
  groupName: string | null;
  jarName: string | null;
  createdAt: string;
};

/** Is the signed-in person on the readers list? */
export async function isFeedbackReader(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_feedback_reader");
  return data === true;
}

/** Newest first, optionally only one kind. */
export async function listFeedback(kind?: FeedbackKind): Promise<FeedbackItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("feedback")
    .select(
      "id, kind, message, reporter_name, screen_name, screen_path, group_name, jar_name, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (kind) query = query.eq("kind", kind);

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as FeedbackKind,
    message: row.message,
    reporterName: row.reporter_name,
    screenName: row.screen_name,
    screenPath: row.screen_path,
    groupName: row.group_name,
    jarName: row.jar_name,
    createdAt: row.created_at,
  }));
}
