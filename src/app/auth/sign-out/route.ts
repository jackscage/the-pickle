import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signing out.
 *
 * A POST rather than a link, so that nothing can sign someone out by getting
 * them to load a URL or by prefetching one.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", request.nextUrl.origin), {
    status: 303,
  });
}
