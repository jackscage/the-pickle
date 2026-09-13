import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands.
 *
 * Supabase can deliver a magic link in two shapes depending on how the email
 * template is written, and this route handles both so that the app works
 * whichever one is configured:
 *
 *   ?code=…                  the default. Swapped for a session here.
 *   ?token_hash=…&type=…     used if the email template is customised.
 *
 * Anything else — an expired link, a link opened twice — goes back to sign-in
 * with a message offering a fresh one, rather than showing an error page.
 * Section 20 of the spec: "offer a fresh one in one tap, without restarting
 * the flow."
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "recovery" | "invite",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=expired`);
}
