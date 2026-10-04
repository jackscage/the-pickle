"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { groupErrorKey } from "@/lib/copy";

/**
 * Starting, naming, sealing and opening jars.
 *
 * Each of these calls a database function (migration 0002), and the database
 * decides whether it is allowed — admin or not, right state or not. This file
 * never decides who may do what. A hidden button is a courtesy; the function
 * refusing is the rule.
 *
 * Every action ends by sending the person back to the screen they came from,
 * with a short error key in the address (?error=NOT_ADMIN) that the screen
 * turns into a sentence from copy.ts.
 */

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Back to the group's jar screen, with an error to show if there was one. */
function backToGroup(groupId: string, error?: unknown): never {
  revalidatePath(`/groups/${groupId}`, "layout");
  if (error) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(groupErrorKey(error))}`);
  }
  redirect(`/groups/${groupId}`);
}

export async function startJar(formData: FormData): Promise<void> {
  const groupId = field(formData, "group_id");
  if (!groupId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_jar", {
    p_group_id: groupId,
    p_name: field(formData, "name") || null,
  });

  backToGroup(groupId, error);
}

export async function renameJar(formData: FormData): Promise<void> {
  const groupId = field(formData, "group_id");
  const jarId = field(formData, "jar_id");
  if (!groupId || !jarId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_jar", {
    p_jar_id: jarId,
    p_name: field(formData, "name"),
  });

  // Renaming can happen from a Past Jar's own screen too, so go back to
  // wherever the form said it came from — but only to a path inside this
  // group, never to an address someone typed in.
  const back = field(formData, "back");
  if (!error && back.startsWith(`/groups/${groupId}/`)) {
    revalidatePath(`/groups/${groupId}`, "layout");
    redirect(back);
  }
  backToGroup(groupId, error);
}

export async function sealJar(formData: FormData): Promise<void> {
  const groupId = field(formData, "group_id");
  const jarId = field(formData, "jar_id");
  if (!groupId || !jarId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("seal_jar", { p_jar_id: jarId });

  backToGroup(groupId, error);
}

/**
 * Open The Jar. Permanent.
 *
 * The confirmation happens on screen before this runs (see
 * components/jar-controls.tsx). After it succeeds, the person lands on the
 * opened jar itself — that is the moment the whole round was building to.
 */
export async function openJar(formData: FormData): Promise<void> {
  const groupId = field(formData, "group_id");
  const jarId = field(formData, "jar_id");
  if (!groupId || !jarId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("open_jar", { p_jar_id: jarId });

  if (error) backToGroup(groupId, error);

  revalidatePath(`/groups/${groupId}`, "layout");
  redirect(`/groups/${groupId}/jars/${jarId}`);
}

/**
 * Change how the group's next jar begins.
 *
 * The one jar-related change that is a plain update rather than a function
 * call. It is still the database deciding: only admins may update a group
 * (migration 0001's policy), only 'admin' or 'automatic' are accepted (0002's
 * check), and switching to automatic starts a jar by itself if the group has
 * none (0002's trigger).
 */
export async function setJarStartMode(formData: FormData): Promise<void> {
  const groupId = field(formData, "group_id");
  const mode = field(formData, "jar_start_mode");
  if (!groupId) redirect("/groups");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pickle_groups")
    .update({ jar_start_mode: mode })
    .eq("id", groupId)
    .select("id");

  // An update the policy refuses does not raise an error; it just changes
  // nothing. Treat "no rows changed" as the refusal it is.
  const refused = error ?? (data && data.length === 0 ? "NOT_ADMIN" : null);

  revalidatePath(`/groups/${groupId}`, "layout");
  if (refused) {
    redirect(
      `/groups/${groupId}/settings?error=${encodeURIComponent(groupErrorKey(refused))}`,
    );
  }
  redirect(`/groups/${groupId}/settings?saved=jars`);
}
