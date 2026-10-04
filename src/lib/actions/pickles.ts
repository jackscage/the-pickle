"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { groupErrorMessage } from "@/lib/copy";

/**
 * Put It In The Pickle.
 *
 * Calls put_pickle (migration 0003), which checks membership, that the jar
 * is still taking pickles, the length, and the spam limit — and writes the
 * pickle and its private authorship row together. This file checks nothing
 * about who may submit; it only passes the words along.
 *
 * If it fails, the writing comes back with the error so it is never lost
 * (spec section 7: "do not silently discard their content").
 */

export type PutPickleState = {
  status: "idle" | "error";
  message?: string;
  text?: string;
};

export async function putPickle(
  _prev: PutPickleState,
  formData: FormData,
): Promise<PutPickleState> {
  const groupId = String(formData.get("group_id") ?? "");
  const jarId = String(formData.get("jar_id") ?? "");
  const text = String(formData.get("text") ?? "");

  if (!groupId || !jarId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("put_pickle", { p_jar_id: jarId, p_text: text });

  if (error) {
    return { status: "error", message: groupErrorMessage(error), text };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?put=1`);
}
