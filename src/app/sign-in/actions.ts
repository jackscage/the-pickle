"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

/**
 * Signing in.
 *
 * One email box does both jobs — creating an account and signing back into
 * one. There is no separate "sign up" screen, because there is nothing to
 * fill in that we don't already ask for on the welcome screen afterwards.
 *
 * Section 5 of the spec: the emailed link is the path that always works, and
 * a password is an optional convenience people can add later in settings.
 */

export type SignInState = {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
};

/** Where the emailed link should land. */
async function originUrl(path: string): Promise<string> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return new URL(path, site).toString();

  // Falling back to the request's own host means preview deployments send
  // links back to themselves rather than to production.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(path, `${proto}://${host}`).toString();
}

function readEmail(formData: FormData): string {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

export async function sendMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  const next = String(formData.get("next") ?? "/");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "That doesn't look like an email address.", email };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: await originUrl(
        `/auth/callback?next=${encodeURIComponent(next)}`,
      ),
    },
  });

  if (error) {
    return { status: "error", message: copy.signIn.genericError, email };
  }

  return { status: "sent", email };
}

export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { status: "error", message: copy.signIn.wrongPassword, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: copy.signIn.wrongPassword, email };
  }

  redirect(next);
}
