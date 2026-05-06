import { defineConfig, devices } from "@playwright/test";

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
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ANTHROPIC_API_KEY: "sk-test-not-real",
      ANTHROPIC_BASE_URL: "http://localhost:3000/api/test-mock/anthropic-mock",
    },
  },
});
