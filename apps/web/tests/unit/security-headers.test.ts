import { describe, expect, it } from "vitest";
// @ts-expect-error next.config.mjs has no type declarations
import nextConfig from "../../next.config.mjs";

async function headerMap(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers?.();
  const rule = rules?.find((r: { source: string }) => r.source === "/(.*)");
  const out: Record<string, string> = {};
  for (const h of rule?.headers ?? []) out[h.key.toLowerCase()] = h.value;
  return out;
}

describe("next.config security headers", () => {
  it("sets conservative headers on every route", async () => {
    const h = await headerMap();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["content-security-policy"]).toBe("frame-ancestors 'none'");
    expect(h["permissions-policy"]).toContain("camera=()");
  });

  it("does not set a script-src CSP (needs nonces)", async () => {
    const h = await headerMap();
    expect(h["content-security-policy"]).not.toMatch(/script-src|default-src/);
  });
});
