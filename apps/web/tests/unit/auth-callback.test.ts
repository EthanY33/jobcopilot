// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth }),
}));

import { GET } from "@/app/api/auth/callback/route";

const ORIGIN = "http://localhost:3000";

function callback(query: string): Promise<Response> {
  return GET(new Request(`${ORIGIN}/api/auth/callback${query}`));
}

function location(res: Response): URL {
  const header = res.headers.get("location");
  if (!header) throw new Error("response has no Location header");
  return new URL(header);
}

// Values an attacker can put in ?next= to leave the app origin. The URL parser
// reads "\" as "/" and drops tab, CR and LF, so most of these parse as "//host".
const HOSTILE_NEXT = [
  ["backslash", "/%5Cevil.example/x"],
  ["double backslash", "/%5C%5Cevil.example"],
  ["tab", "/%09/evil.example"],
  ["line feed", "/%0A/evil.example"],
  ["carriage return", "/%0D/evil.example"],
  ["protocol-relative", "//evil.example"],
  ["absolute URL", "https://evil.example/"],
  ["dot segment before a double slash", "/.//evil.example"],
] as const;

beforeEach(() => {
  auth.exchangeCodeForSession.mockReset();
  auth.signOut.mockReset();
  auth.exchangeCodeForSession.mockResolvedValue({
    data: { user: { id: "u1", email: "owner@example.com" }, session: {} },
    error: null,
  });
  auth.signOut.mockResolvedValue({ error: null });
});

describe("GET /api/auth/callback next parameter", () => {
  it.each(HOSTILE_NEXT)("stays on the app origin with a code (%s)", async (_label, next) => {
    const res = await callback(`?code=ok&next=${next}`);
    expect(res.status).toBe(307);
    const target = location(res);
    expect(target.origin).toBe(ORIGIN);
    expect(target.pathname).toBe("/dashboard");
  });

  it.each(HOSTILE_NEXT)("stays on the app origin without a code (%s)", async (_label, next) => {
    const res = await callback(`?next=${next}`);
    expect(res.status).toBe(307);
    expect(location(res).origin).toBe(ORIGIN);
  });

  it("keeps a same-origin path and query", async () => {
    const res = await callback(`?code=ok&next=${encodeURIComponent("/tracker?tab=1")}`);
    const target = location(res);
    expect(target.origin).toBe(ORIGIN);
    expect(target.pathname + target.search).toBe("/tracker?tab=1");
  });

  it("defaults to /dashboard", async () => {
    const res = await callback("?code=ok");
    expect(location(res).href).toBe(`${ORIGIN}/dashboard`);
  });
});

describe("GET /api/auth/callback without a session", () => {
  it("sends a request with no code to the login page and ignores next", async () => {
    const res = await callback("?next=/tracker");
    const target = location(res);
    expect(target.pathname + target.search).toBe("/login?error=auth_failed");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("sends a failed code exchange to the login page and ignores next", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "invalid flow state" },
    });
    const res = await callback("?code=bad&next=/tracker");
    const target = location(res);
    expect(target.pathname + target.search).toBe("/login?error=auth_failed");
  });
});
