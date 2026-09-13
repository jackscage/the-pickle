"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

/**
 * Saving a profile, and setting a password.
 *
 * The picture itself does not pass through here. It goes straight from the
 * browser to Supabase storage, and only the resulting address arrives in this
 * action — which keeps image bytes out of the server entirely and means a big
 * photo can't fail a form submission.
 */

export type ProfileState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const taglineRaw = String(formData.get("tagline") ?? "").trim();
  const avatarUrlRaw = String(formData.get("avatar_url") ?? "").trim();
  const removeAvatar = formData.get("remove_avatar") === "1";
  const redirectToRaw = String(formData.get("redirect_to") ?? "");

  if (!displayName) {
    return { status: "error", message: copy.profile.nameRequired };
  }
  if (displayName.length > 40) {
    return { status: "error", message: copy.profile.nameTooLong };
  }
  if (taglineRaw.length > 60) {
    return { status: "error", message: copy.profile.taglineTooLong };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Build the update so that an untouched picture is left exactly as it was.
  const patch: Record<string, string | null> = {
    id: user.id,
    display_name: displayName,
    tagline: taglineRaw === "" ? null : taglineRaw,
  };

  if (removeAvatar) {
    patch.avatar_url = null;
  } else if (avatarUrlRaw !== "") {
    patch.avatar_url = avatarUrlRaw;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(patch, { onConflict: "id" });

  if (error) {
    return { status: "error", message: copy.common.somethingWrong };
  }

  revalidatePath("/", "layout");

  const redirectTo =
    redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//")
      ? redirectToRaw
      : null;

  if (redirectTo) redirect(redirectTo);

  return { status: "saved", message: copy.profile.saved };
}

export type PasswordState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

export async function setPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { status: "error", message: copy.password.tooShort };
  }
  if (password !== confirm) {
    return { status: "error", message: copy.password.mismatch };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: copy.common.somethingWrong };
  }

  return { status: "saved", message: copy.password.done };
}
