// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

// The helper remembers whether it has logged, so load a fresh copy per test.
async function loadIsEmailAllowed() {
  vi.resetModules();
  const mod = await import("@/lib/auth/allowlist");
  return mod.isEmailAllowed;
}

let errorLog: MockInstance<Parameters<Console["error"]>, void>;

beforeEach(() => {
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isEmailAllowed with AUTH_ALLOWED_EMAILS set", () => {
  it("allows a listed email and denies any other", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("owner@example.com")).toBe(true);
    expect(isEmailAllowed("stranger@example.com")).toBe(false);
    expect(isEmailAllowed("owner@example.com.evil.example")).toBe(false);
  });

  it("splits on commas, trims entries and skips empty ones", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", " owner@example.com , ,second@example.com,");
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("owner@example.com")).toBe(true);
    expect(isEmailAllowed("second@example.com")).toBe(true);
    expect(isEmailAllowed("")).toBe(false);
  });

  it("ignores case on both sides", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "Owner@Example.COM");
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("owner@example.com")).toBe(true);
    expect(isEmailAllowed("OWNER@EXAMPLE.COM")).toBe(true);
  });

  it("denies a user with no email", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed(undefined)).toBe(false);
    expect(isEmailAllowed(null)).toBe(false);
  });

  it("applies the list in production without logging", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("owner@example.com")).toBe(true);
    expect(isEmailAllowed("stranger@example.com")).toBe(false);
    expect(errorLog).not.toHaveBeenCalled();
  });
});

describe("isEmailAllowed with AUTH_ALLOWED_EMAILS unset or empty", () => {
  it.each(["", "   ", " , ,"])("allows everyone outside production (%j)", async (value) => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", value);
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("allows everyone outside production when the variable is absent", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "");
    delete process.env.AUTH_ALLOWED_EMAILS;
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it.each(["", " , ,"])("denies everyone in production (%j)", async (value) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_EMAILS", value);
    const isEmailAllowed = await loadIsEmailAllowed();
    expect(isEmailAllowed("owner@example.com")).toBe(false);
    expect(isEmailAllowed(undefined)).toBe(false);
  });

  it("logs one line that names the variable when it denies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "");
    const isEmailAllowed = await loadIsEmailAllowed();
    isEmailAllowed("owner@example.com");
    isEmailAllowed("stranger@example.com");
    isEmailAllowed("owner@example.com");
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(String(errorLog.mock.calls[0]?.[0])).toContain("AUTH_ALLOWED_EMAILS");
  });
});
