"use server";

import { getAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_ENABLED } from "./config";
import { feedbackCopy } from "./copy";
import { describeScreen } from "./screens";

/**
 * Sending feedback.
 *
 * The tester types one message and picks a type. Everything else is filled
 * in here, on the server: who they are, the screen they were on in plain
 * English, and the names of the group and jar on that screen — looked up
 * with the tester's own access, so it is only ever what they could already
 * see.
 *
 * ANONYMITY: this records a screen, never a pickle. It reads groups and
 * jars, never pickles or pickle_authors.
 */

export type FeedbackState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

const KINDS = ["bug", "suggestion", "confusion"] as const;

export async function sendFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  if (!FEEDBACK_ENABLED) return { status: "error", message: feedbackCopy.errors.failed };

  const message = String(formData.get("message") ?? "").trim();
  const kindInput = String(formData.get("kind") ?? "");
  const kind = (KINDS as readonly string[]).includes(kindInput) ? kindInput : "suggestion";

  // Only the path, never the part after "?", and only an address inside the app.
  const rawPath = String(formData.get("path") ?? "/").split("?")[0];
  const path = rawPath.startsWith("/") ? rawPath.slice(0, 300) : "/";

  if (!message) return { status: "error", message: feedbackCopy.errors.empty };
  if (message.length > 2000) return { status: "error", message: feedbackCopy.errors.tooLong };

  const account = await getAccount();
  if (!account) return { status: "error", message: feedbackCopy.errors.signedOut };

  const supabase = await createClient();
  const screen = describeScreen(path);

  let groupName: string | null = null;
  let jarId = screen.jarId;
  let jarName: string | null = null;

  if (screen.groupId) {
    const { data: group } = await supabase
      .from("pickle_groups")
      .select("name")
      .eq("id", screen.groupId)
      .maybeSingle();
    groupName = group?.name ?? null;

    // On a group's own screen the jar is not in the address; it is the
    // group's current one, if it has one.
    const jarQuery = supabase.from("jars").select("id, name, opened_at").eq("group_id", screen.groupId);
    const { data: jar } = jarId
      ? await jarQuery.eq("id", jarId).maybeSingle()
      : await jarQuery.neq("status", "opened").maybeSingle();
    if (jar) {
      jarId = jar.id;
      jarName = jar.name ?? (jar.opened_at ? "unnamed, opened" : "unnamed, current");
    }
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: account.userId,
    reporter_name: account.profile?.display_name ?? null,
    kind,
    message,
    screen_path: path,
    screen_name: screen.name,
    group_id: groupName ? screen.groupId : null,
    group_name: groupName,
    jar_id: jarName ? jarId : null,
    jar_name: jarName,
  });

  if (error) return { status: "error", message: feedbackCopy.errors.failed };
  return { status: "sent" };
}
