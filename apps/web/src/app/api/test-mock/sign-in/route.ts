import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Test-only sign-in endpoint. Gated to non-production builds. Lets the
 * Playwright auth setup obtain a proper @supabase/ssr session cookie via
 * password grant without going through the OAuth UI or magic-link flow.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("not found", { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "missing email/password" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
