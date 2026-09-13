import { NextResponse, type NextRequest } from "next/server";

/**
 * An alias for /auth/callback.
 *
 * Supabase's own documentation uses /auth/confirm in its email templates. If
 * the template in the Supabase dashboard ever gets written that way, links
 * still land somewhere real instead of 404ing — which would look, to whoever
 * clicked it, exactly like the app being broken.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}
