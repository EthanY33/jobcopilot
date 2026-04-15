import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(response: NextResponse, target: URL): NextResponse {
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export async function updateSession(request: NextRequest) {
  // `let` preserved for the @supabase/ssr cookbook pattern — `response` may be rewritten by cookie mutations.
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
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

  return response;
}
