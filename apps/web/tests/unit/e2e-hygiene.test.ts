import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  E2E_BASE_URL,
  isLocalSupabaseUrl,
  resolveE2eAccount,
} from "../e2e/e2e-guards";

const webRoot = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(webRoot, rel), "utf8");

describe("e2e account planting guard", () => {
  const local = { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" };

  it("recognises local Supabase URLs only", () => {
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("https://abc.supabase.co")).toBe(false);
    expect(isLocalSupabaseUrl("https://localhost.evil.com")).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
  });

  it("refuses without E2E_PASSWORD", () => {
    expect(() => resolveE2eAccount(local)).toThrow(/E2E_PASSWORD/);
    expect(() => resolveE2eAccount({ ...local, E2E_PASSWORD: "short" })).toThrow(
      /E2E_PASSWORD/,
    );
  });

  it("refuses a remote project unless explicitly opted in", () => {
    const remote = {
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      E2E_PASSWORD: "a-long-enough-password",
    };
    expect(() => resolveE2eAccount(remote)).toThrow(/non-local/);
    expect(
      resolveE2eAccount({ ...remote, E2E_ALLOW_REMOTE_SUPABASE: "1" }).password,
    ).toBe("a-long-enough-password");
  });

  it("allows a local project with a password", () => {
    const acct = resolveE2eAccount({ ...local, E2E_PASSWORD: "a-long-enough-password" });
    expect(acct.email).toBe("e2e@jobcopilot.test");
  });

  it("keeps no literal e2e password in tracked scripts", () => {
    for (const rel of ["tests/e2e/auth.setup.ts", "scripts/build-screenshots.ts"]) {
      expect(read(rel)).not.toMatch(/e2e-jobcopilot-test-password/);
    }
  });
});

describe("Playwright server isolation", () => {
  const config = read("playwright.config.ts");

  it("never reuses an existing server", () => {
    expect(config).toMatch(/reuseExistingServer:\s*false/);
  });

  it("does not use the dev port 3000", () => {
    expect(E2E_BASE_URL).not.toMatch(/:3000$/);
    expect(config).not.toMatch(/localhost:3000/);
  });
});

describe("e2e env reaches every worker", () => {
  it("loads the root env in the config, not only in the setup project", () => {
    const config = read("playwright.config.ts");
    expect(config).toMatch(/from "\.\/tests\/e2e\/load-env"/);
    expect(config).toMatch(/^loadE2eEnv\(\);$/m);
  });

  it("keeps the loader free of Playwright and Prisma imports", () => {
    expect(read("tests/e2e/load-env.ts")).not.toMatch(/@playwright|@jobcopilot\/db/);
  });

  it("documents the shared .next hazard next to the dev server", () => {
    expect(read("playwright.config.ts")).toMatch(/Stop `pnpm dev`/);
  });
});

describe("ship-criterion spec is hermetic", () => {
  const spec = read("tests/e2e/google-referral.spec.ts");

  it("resets fixture state and requires a first-draft flow", () => {
    expect(spec).toMatch(/resetFixtureState/);
    expect(spec).not.toMatch(/Draft\|Regenerate/);
    expect(spec).toMatch(/waitForResponse/);
  });
});
