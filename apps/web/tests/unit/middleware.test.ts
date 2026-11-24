// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// No Supabase project is contacted: fetch is stubbed with a minimal GoTrue.
const SUPABASE_URL = "http://127.0.0.1:54321";
// @supabase/ssr names the cookie after the first label of the project host.
const COOKIE_NAME = "sb-127-auth-token";
const ORIGIN = "http://localhost:3000";

const OWNER = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

function fakeJwt(label: string): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part({ sub: OWNER.id, label })}.sig`;
}

const OLD_TOKEN = fakeJwt("old");
const REFRESHED_TOKEN = fakeJwt("refreshed");

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// A session cookie in the shape @supabase/ssr writes: "base64-" + base64url(JSON).
function sessionCookie(expiresAt: number): string {
  const session = {
    access_token: OLD_TOKEN,
    refresh_token: "refresh-old",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: OWNER,
  };
  return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

const expiredSession = () => sessionCookie(nowSeconds() - 60);

function stubGoTrue(user: typeof OWNER = OWNER) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin !== SUPABASE_URL) throw new Error(`unexpected fetch to ${url.origin}`);
    if (url.pathname === "/auth/v1/token") {
      return Response.json({
        access_token: REFRESHED_TOKEN,
        refresh_token: "refresh-new",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: nowSeconds() + 3600,
        user,
      });
    }
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    throw new Error(`unexpected fetch to ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`${ORIGIN}${path}`, init);
}

function authCookieHeader(res: Response): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!header) throw new Error("response does not set the auth cookie");
  return header;
}

function accessTokenIn(cookieHeader: string | null): string {
  const pair = (cookieHeader ?? "")
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=base64-`));
  if (!pair) throw new Error("no auth cookie in the Cookie header");
  const encoded = pair.slice(`${COOKIE_NAME}=base64-`.length);
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    access_token: string;
  };
  return session.access_token;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("middleware session refresh", () => {
  it.each(["/", "/login"])(
    "keeps Max-Age and SameSite on the refreshed cookie when %s redirects",
    async (path) => {
      stubGoTrue();
      const res = await middleware(request(path, { headers: { cookie: expiredSession() } }));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/dashboard");
      const cookie = authCookieHeader(res);
      expect(cookie).toMatch(/;\s*Max-Age=\d+/i);
      expect(cookie).toMatch(/;\s*SameSite=lax/i);
      expect(cookie).toMatch(/;\s*Path=\//i);
    },
  );

  it("writes a refreshed token to the forwarded request and to the response", async () => {
    stubGoTrue();
    const res = await middleware(request("/tracker", { headers: { cookie: expiredSession() } }));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    // The response cookie reaches the browser.
    const cookie = authCookieHeader(res);
    expect(accessTokenIn(cookie.split(";")[0] ?? null)).toBe(REFRESHED_TOKEN);
    expect(cookie).toMatch(/;\s*SameSite=lax/i);
    // The overridden Cookie header reaches the page or route handler behind the middleware.
    expect(accessTokenIn(res.headers.get("x-middleware-request-cookie"))).toBe(REFRESHED_TOKEN);
  });

  it("redirects a signed-out visitor from an app page to /login", async () => {
    const fetchMock = stubGoTrue();
    const res = await middleware(request("/tracker"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("middleware cross-site write check", () => {
  it("rejects a POST to an API route from another origin", async () => {
    const fetchMock = stubGoTrue();
    const res = await middleware(
      request("/api/variants", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "localhost:3000", cookie: expiredSession() },
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "cross-site request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["PUT", "PATCH", "DELETE"])("rejects a cross-site %s", async (method) => {
    stubGoTrue();
    const res = await middleware(
      request("/api/variants/abc", {
        method,
        headers: { origin: "https://evil.example", host: "localhost:3000" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects an opaque origin", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/api/postings/extract", {
        method: "POST",
        headers: { origin: "null", host: "localhost:3000" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("allows a same-origin POST", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/api/variants", {
        method: "POST",
        headers: { origin: ORIGIN, host: "localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("compares against the forwarded host behind a proxy", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/api/variants", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          host: "internal:3000",
          "x-forwarded-host": "app.example.com",
        },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("allows a POST with no Origin header", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/api/variants", { method: "POST", headers: { host: "localhost:3000" } }),
    );
    expect(res.status).toBe(200);
  });

  it("does not check GET requests", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/api/variants", {
        headers: { origin: "https://evil.example", host: "localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
