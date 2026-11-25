import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");
const readJson = (rel: string) =>
  JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

describe("Prisma client generation on a fresh clone", () => {
  const turbo = readJson("turbo.json");

  it("runs generate before typecheck, test and build", () => {
    for (const task of ["typecheck", "test", "build"]) {
      expect(turbo.tasks[task].dependsOn).toContain("^generate");
    }
  });

  it("defines a generate task that is never cached", () => {
    expect(turbo.tasks.generate.cache).toBe(false);
  });

  it("generates without needing a .env file", () => {
    const db = readJson("packages/db/package.json");
    expect(db.scripts.generate).toBe("prisma generate");
  });
});
