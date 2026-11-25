import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT } from "./tests/e2e/e2e-guards";
import { loadE2eEnv } from "./tests/e2e/load-env";

// Runs in the main Playwright process, so the setup and chromium workers (the
// spec's Prisma reset needs DATABASE_URL) and the webServer child all inherit it.
loadE2eEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // 120s budget per test: the ship-criterion flow drives 3 API calls and 2
  // route compiles (/applications/[id], /tracker) on a cold dev server,
  // which can exceed Playwright's 30s default on Windows.
  timeout: 120_000,
  // 60s for individual `expect(...).toXxx(...)` assertions — the
  // /applications/[id] route can take >30s to compile on first hit, so
  // toHaveURL after a router.push needs more headroom than the default 5s.
  expect: { timeout: 60_000 },
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Own port, never reused: an already-running `pnpm dev` on :3000 would not
    // have the Anthropic mock env below and would send e2e traffic to the
    // real API. If :3100 is busy Playwright fails instead of attaching.
    // Stop `pnpm dev` before running e2e: both are `next dev` for apps/web and
    // share apps/web/.next, and two dev servers on one .next dir corrupt it.
    command: `pnpm exec next dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ANTHROPIC_API_KEY: "sk-test-not-real",
      ANTHROPIC_BASE_URL: `${E2E_BASE_URL}/api/test-mock/anthropic-mock`,
    },
  },
});
