import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is signed in, and have they finished setting up?
 *
 * Everything on the server that needs to know about the current person goes
 * through this file, so there is exactly one answer to "is this person
 * allowed to be here" rather than a slightly different check on each screen.
 */

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  tagline: string | null;
};

export type Account = {
  userId: string;
  email: string | null;
  profile: Profile | null;
};

/** The signed-in person, or null. Never throws. */
export async function getAccount(): Promise<Account | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, tagline")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

/**
 * For screens that require a finished account. Sends people who aren't signed
 * in to sign-in, and people who are signed in but haven't picked a display
 * name yet to the welcome screen.
 */
export async function requireProfile(): Promise<Account & { profile: Profile }> {
  const account = await getAccount();
  if (!account) redirect("/sign-in");
  if (!account.profile) redirect("/welcome");
  return account as Account & { profile: Profile };
}

/** True when the app has been deployed without its Supabase keys. */
export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
