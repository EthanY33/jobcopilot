import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";

// Copy whole cookies, not just name and value: a refreshed session cookie
// must keep its Path, SameSite and Max-Age on every response that replaces
// the pass-through one.
function withCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function redirectWithCookies(response: NextResponse, target: URL): NextResponse {
  return withCookies(response, NextResponse.redirect(target));
}

// Remove every Supabase session cookie from the request that is forwarded to
// the page or route handler behind the middleware.
function stripSession(request: NextRequest): boolean {
  let stripped = false;
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      request.cookies.delete(cookie.name);
      stripped = true;
    }
  });
  return stripped;
}

export async function updateSession(request: NextRequest) {
  // `let`: setAll rebuilds `response` after it updates the request cookies.
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // A refreshed token goes to the forwarded request (so the page or
          // route handler behind the middleware reads it) and to the response
          // (so the browser stores it).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();

  // Forward a session only when this middleware verified it. If the lookup
  // failed (Auth outage, rate limit, network error) the allowlist could not be
  // checked, so the handler behind must not see the cookie and re-verify it.
  if (!data.user && stripSession(request)) {
    response = withCookies(response, NextResponse.next({ request: { headers: request.headers } }));
  }

  const { pathname } = request.nextUrl;

  // A signed-in account that is not on the allowlist gets no app access: 403
  // for the API, the login page with a message for everything else. "/" and
  // "/login" are served to a signed-out visitor (the session is stripped).
  if (data.user && !isEmailAllowed(data.user.email)) {
    if (pathname.startsWith("/api/")) {
      return withCookies(response, NextResponse.json({ error: "not_allowed" }, { status: 403 }));
    }
    if (pathname === "/" || pathname === "/login") {
      // Serve the public page, but never forward the refused session: the
      // pathname seen here can differ from the route that really runs behind
      // the middleware, so that route must see a signed-out request.
      stripSession(request);
      return withCookies(response, NextResponse.next({ request: { headers: request.headers } }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=not_allowed";
    return redirectWithCookies(response, url);
  }

  const isAuthedPath = pathname.startsWith("/dashboard")
    || pathname.startsWith("/tracker")
    || pathname.startsWith("/applications")
    || pathname.startsWith("/profile")
    || pathname.startsWith("/variants");

  if (isAuthedPath && !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(response, url);
  }

  if (pathname === "/login" && data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(response, url);
  }

  if (pathname === "/" && data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(response, url);
  }

  return response;
}
