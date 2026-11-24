import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "../..");

describe("apps/web ESLint setup", () => {
  it("resolves a config that enables the Next.js and React hooks rules", async () => {
    const eslint = new ESLint({ cwd: webRoot });
    const config = await eslint.calculateConfigForFile(
      path.join(webRoot, "src/middleware.ts"),
    );
    expect(config.rules).toHaveProperty("react-hooks/rules-of-hooks");
    expect(config.rules).toHaveProperty("@next/next/no-html-link-for-pages");
  });
});
