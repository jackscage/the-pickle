import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the signed-in session alive.
 *
 * A Supabase session is a pair of cookies that expire fairly quickly and get
 * silently swapped for fresh ones. Server Components are not allowed to write
 * cookies, so that refresh has to happen somewhere that can — which is here,
 * in middleware, on the way in to every request.
 *
 * Without this, people would appear signed in until the moment they weren't,
 * usually mid-action. With it, sessions just persist, which is what section 5
 * of the spec assumes when it says most members will sign in rarely.
 */

/**
 * Routes a signed-out visitor is allowed to reach.
 *
 * /api/health is on the list on purpose: a health check that redirects to the
 * sign-in page when nobody is signed in is not a health check.
 */
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/auth/callback",
  "/auth/confirm",
  "/auth/sign-out",
  "/api/health",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If the app is deployed without its keys, don't crash every page — the
  // home page explains what's missing, and /api/health reports it.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() re-checks the token with Supabase rather than trusting the
  // cookie's contents. Do not swap this for getSession() — that one reads the
  // cookie and believes it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return response;
}
