import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands.
 *
 * Supabase delivers a sign-in link in one of two shapes depending on how the
 * email template is written, and this route handles both:
 *
 *   ?code=…                  the default. Swapped for a session here.
 *   ?token_hash=…&type=…     used if the email template is customised.
 *
 * `type` includes `signup` because a person's very first link is a signup
 * confirmation rather than a magic link — that one is the most important link
 * in the whole app to get right, since it is somebody's first impression.
 *
 * Anything that fails goes back to sign-in with a message offering a fresh
 * link, rather than showing an error page (spec §20).
 */

const VALID_TYPES = [
  "magiclink",
  "signup",
  "email",
  "email_change",
  "recovery",
  "invite",
] as const;

type OtpType = (typeof VALID_TYPES)[number];

function isValidType(value: string | null): value is OtpType {
  return value !== null && (VALID_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Supabase puts its own failures in the query string rather than failing the
  // request. Pass the reason along so sign-in can say something specific.
  const supabaseError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (supabaseError) {
    return NextResponse.redirect(`${origin}/sign-in?error=expired`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && isValidType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=expired`);
}
