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
  // No allowlist: outside production every signed-in email is accepted.
  vi.stubEnv("AUTH_ALLOWED_EMAILS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

  it("rejects a cross-site write whose middleware path was shifted by a query parameter", async () => {
    stubGoTrue();
    const res = await middleware(
      request("/x/api/variants?__nextLocale=x", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "localhost:3000", cookie: sessionCookie(nowSeconds() + 3600) },
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "cross-site request" });
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

describe("middleware sign-in allowlist", () => {
  const STRANGER = { ...OWNER, id: "user-2", email: "stranger@example.com" };
  const validSession = () => sessionCookie(nowSeconds() + 3600);

  function loginTarget(res: Response): string {
    const target = new URL(res.headers.get("location") ?? "");
    expect(target.origin).toBe(ORIGIN);
    return target.pathname + target.search;
  }

  describe("with a signed-in email that is not on the list", () => {
    beforeEach(() => {
      vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
      stubGoTrue(STRANGER);
    });

    it.each(["/dashboard", "/tracker", "/applications/abc", "/profile", "/variants"])(
      "redirects %s to the login page with the not_allowed message",
      async (path) => {
        const res = await middleware(request(path, { headers: { cookie: validSession() } }));
        expect(res.status).toBe(307);
        expect(loginTarget(res)).toBe("/login?error=not_allowed");
      },
    );

    it("answers an API read with 403 JSON", async () => {
      const res = await middleware(request("/api/variants", { headers: { cookie: validSession() } }));
      expect(res.status).toBe(403);
      expect(res.headers.get("x-middleware-next")).toBeNull();
      expect(await res.json()).toEqual({ error: "not_allowed" });
    });

    it("answers a same-origin API write with 403 before the handler can spend the Anthropic key", async () => {
      const res = await middleware(
        request("/api/profile/parse-resume", {
          method: "POST",
          headers: { origin: ORIGIN, host: "localhost:3000", cookie: validSession() },
        }),
      );
      expect(res.status).toBe(403);
      expect(res.headers.get("x-middleware-next")).toBeNull();
    });

    it.each(["/", "/login"])("serves %s like a signed-out visit instead of redirecting", async (path) => {
      const res = await middleware(request(path, { headers: { cookie: validSession() } }));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("location")).toBeNull();
    });

    function forwardedCookies(res: Response): string {
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("x-middleware-override-headers")).toContain("cookie");
      return res.headers.get("x-middleware-request-cookie") ?? "";
    }

    it.each(["/login?/api/variants&__nextLocale=login%3F", "/?x=/api/variants"])(
      "does not forward the refused session on the pass-through for %s",
      async (path) => {
        const res = await middleware(
          request(path, { headers: { cookie: `theme=dark; ${validSession()}` } }),
        );
        const forwarded = forwardedCookies(res);
        expect(forwarded).not.toContain(COOKIE_NAME);
        expect(forwarded).toContain("theme=dark");
      },
    );

    it("does not forward a just-refreshed refused token on the pass-through", async () => {
      const res = await middleware(request("/login", { headers: { cookie: expiredSession() } }));
      expect(forwardedCookies(res)).not.toContain(COOKIE_NAME);
    });

    it("keeps the refreshed cookie attributes on the denial redirect", async () => {
      const res = await middleware(request("/dashboard", { headers: { cookie: expiredSession() } }));
      expect(loginTarget(res)).toBe("/login?error=not_allowed");
      expect(authCookieHeader(res)).toMatch(/;\s*SameSite=lax/i);
    });
  });

  it("lets a listed email through, ignoring case", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "second@example.com, OWNER@example.com");
    stubGoTrue();
    const page = await middleware(request("/dashboard", { headers: { cookie: validSession() } }));
    expect(page.headers.get("x-middleware-next")).toBe("1");
    const api = await middleware(request("/api/variants", { headers: { cookie: validSession() } }));
    expect(api.status).toBe(200);
    const root = await middleware(request("/", { headers: { cookie: validSession() } }));
    expect(loginTarget(root)).toBe("/dashboard");
  });

  it("denies every signed-in user in production when the list is not set", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "");
    stubGoTrue();
    const page = await middleware(request("/dashboard", { headers: { cookie: validSession() } }));
    expect(loginTarget(page)).toBe("/login?error=not_allowed");
    const api = await middleware(request("/api/variants", { headers: { cookie: validSession() } }));
    expect(api.status).toBe(403);
  });

  it("still sends a signed-out visitor to the plain login page", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
    stubGoTrue();
    const res = await middleware(request("/dashboard"));
    expect(loginTarget(res)).toBe("/login");
  });
});
