/**
 * Minimal .env loader shared by playwright.config.ts and auth.setup.ts. Kept
 * free of Playwright and Prisma imports so vitest can load it.
 *
 * Playwright does not auto-load Next.js env files, and the generated Prisma
 * client only auto-loads packages/db/.env, not the workspace-root .env. The
 * config calls this in the main process, so every worker (setup, chromium) and
 * the webServer child inherit the result. Values already in the environment
 * win. Lines that cannot be parsed are skipped.
 */
import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Loads apps/web/.env.local, then the workspace-root .env (webRoot is apps/web). */
export function loadE2eEnv(webRoot: string = process.cwd()): void {
  loadEnvFile(path.resolve(webRoot, ".env.local"));
  loadEnvFile(path.resolve(webRoot, "..", "..", ".env"));
}
