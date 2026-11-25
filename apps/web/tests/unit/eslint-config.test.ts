import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const configPath = path.resolve(__dirname, "../../.eslintrc.json");

describe("apps/web ESLint setup", () => {
  it("extends the Next.js core-web-vitals and typescript presets", () => {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      extends?: string | string[];
    };
    const extended = ([] as string[]).concat(config.extends ?? []);
    expect(extended).toContain("next/core-web-vitals");
    expect(extended).toContain("next/typescript");
  });
});
