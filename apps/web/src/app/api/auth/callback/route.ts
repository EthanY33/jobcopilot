import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// The URL parser reads "\" as "/" and drops tab, CR and LF, so "/\host" and
// "/<tab>/host" would parse as "//host": another origin.
function hasBackslashOrControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0x5c || code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

// Resolve ?next= to a URL on the app's own origin, or fall back to /dashboard.
// The caller redirects to the returned URL object; the path is never re-parsed.
function safeNextUrl(raw: string | null, origin: string): URL {
  const fallback = new URL("/dashboard", origin);
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (hasBackslashOrControlChar(raw)) return fallback;
  let target: URL;
  try {
    target = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (target.origin !== origin || target.pathname.startsWith("//")) return fallback;
  return target;
}

function loginError(origin: string, error: string): NextResponse {
  const target = new URL("/login", origin);
  target.searchParams.set("error", error);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Without a completed code exchange there is no sign-in to continue, so
  // ?next= is not honoured.
  if (!code) return loginError(url.origin, "auth_failed");

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return loginError(url.origin, "auth_failed");

  return NextResponse.redirect(safeNextUrl(url.searchParams.get("next"), url.origin));
}
