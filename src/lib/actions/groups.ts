"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copy, groupErrorMessage } from "@/lib/copy";

/**
 * Creating, joining and leaving Pickle Groups.
 *
 * Every one of these calls a database function rather than writing to a table
 * directly, and that is deliberate. The 75-member cap, the locked check and
 * the "a group must never have zero admins" rule are all enforced inside
 * those functions, where they apply no matter what calls them. If this file
 * inserted rows itself, those rules would only be as good as this file.
 */

export type GroupFormState = {
  status: "idle" | "error";
  message?: string;
};

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { status: "error", message: copy.groupErrors.NO_NAME };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_pickle_group", { p_name: name })
    .single();

  if (error || !data) {
    return { status: "error", message: groupErrorMessage(error) };
  }

  const created = data as { group_id: string; pickle_code: string };

  revalidatePath("/groups");
  // ?new=1 tells the group screen to lead with the code, since the first
  // thing anyone does after making a group is send it to people.
  redirect(`/groups/${created.group_id}?new=1`);
}

export async function joinGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return { status: "error", message: copy.groupErrors.BAD_CODE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_pickle_group", {
    p_code: code,
  });

  if (error || !data) {
    return { status: "error", message: groupErrorMessage(error) };
  }

  revalidatePath("/groups");
  redirect(`/groups/${data as string}`);
}

export async function leaveGroup(formData: FormData): Promise<void> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_pickle_group", {
    p_group_id: groupId,
  });

  if (error) {
    // The only realistic failure is the last-admin rule, which the settings
    // screen already warns about. Send them back with it named in the URL so
    // the screen can say what happened.
    redirect(
      `/groups/${groupId}/settings?error=${encodeURIComponent(
        groupErrorMessage(error),
      )}`,
    );
  }

  revalidatePath("/groups");
  redirect("/groups");
}

export async function regenerateCode(formData: FormData): Promise<void> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) redirect("/groups");

  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_pickle_code", {
    p_group_id: groupId,
  });

  if (error) {
    redirect(
      `/groups/${groupId}/settings?error=${encodeURIComponent(
        groupErrorMessage(error),
      )}`,
    );
  }

  revalidatePath(`/groups/${groupId}`, "layout");
  redirect(`/groups/${groupId}/settings?codechanged=1`);
}
