import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF defence in depth for the cookie-authenticated API. Browsers send Origin
// on every cross-site write, so a write to /api whose Origin host is not the
// host being served is refused before any handler runs. Requests without an
// Origin header (non-browser clients) are left to the handlers' auth checks.
function isCrossSiteApiWrite(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  try {
    return new URL(origin).host !== host.toLowerCase();
  } catch {
    // "null" (an opaque origin) or anything else that is not a URL.
    return true;
  }
}

export async function middleware(request: NextRequest) {
  if (isCrossSiteApiWrite(request)) {
    return NextResponse.json({ error: "cross-site request" }, { status: 403 });
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
