import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Copy whole cookies, not just name and value: a refreshed session cookie
// must keep its Path, SameSite and Max-Age on the redirect too.
function redirectWithCookies(response: NextResponse, target: URL): NextResponse {
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
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

  const { pathname } = request.nextUrl;
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
