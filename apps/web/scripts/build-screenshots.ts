/**
 * Captures viewport screenshots of the six redesigned pages and writes them
 * to docs/assets/screenshots/ for the README Preview section.
 *
 * Drives Playwright directly (no test runner, no fixtures) against an already-
 * running dev server. Signs in via /api/test-mock/sign-in for the authenticated
 * routes; uses a fresh empty-cookies context for /login so middleware does not
 * redirect away.
 *
 * Prereq: dev server running on http://localhost:3000 with the mock anthropic
 * base URL configured (see playwright.config.ts webServer block) and the
 * e2e@jobcopilot.test user already seeded in Supabase (auth.setup.ts handles
 * this on any prior `pnpm test:e2e` run). Set E2E_PASSWORD to the same value
 * the e2e run used.
 *
 * Run: pnpm tsx scripts/build-screenshots.ts
 */

import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "assets", "screenshots");
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const TEST_EMAIL = "e2e@jobcopilot.test";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";
// 1600 wide gives the 7-column kanban enough room that the empty-state hints
// don't overflow into adjacent columns; 900 tall covers the application
// detail above the fold (header + tabs + Job Description + Requirements).
const VIEWPORT = { width: 1600, height: 900 };

async function settle(page: Page) {
  await page.waitForTimeout(800);
}

async function shoot(page: Page, route: string, filename: string) {
  // 120s budget for cold compile (next dev compiles each route on first hit;
  // /applications/[id] in particular regularly exceeds the 30s default).
  await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  // networkidle is unreliable with framer-motion + SMIL; settle by timeout.
  await settle(page);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    animations: "disabled",
  });
  console.log(`  -> ${filename}`);
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  // /login — unauthenticated context
  console.log("login (unauthenticated)");
  {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      colorScheme: "dark",
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await shoot(page, "/login", "login.png");
    await ctx.close();
  }

  // Authenticated routes — fresh context, sign in via the in-app test endpoint.
  console.log("authenticated routes");
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  const res = await page.request.post(`${BASE_URL}/api/test-mock/sign-in`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`sign-in failed: ${res.status()} ${await res.text()}`);
  }

  for (const route of ["/dashboard", "/variants"] as const) {
    const filename = route.slice(1).replace(/\//g, "-") + ".png";
    await shoot(page, route, filename);
  }

  // /profile mounts a "Loading…" placeholder until the React Query for
  // /api/profile resolves. Wait for the Skills heading to appear.
  console.log("profile (with data)");
  await page.goto(`${BASE_URL}/profile`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByRole("heading", { name: "Skills" }).waitFor({ timeout: 30_000 });
  await settle(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "profile.png"),
    animations: "disabled",
  });
  console.log("  -> profile.png");

  // /tracker needs the React Query fetch to land before the kanban renders;
  // wait for a column header to appear instead of the "Loading applications…"
  // placeholder.
  console.log("tracker (with kanban data)");
  await page.goto(`${BASE_URL}/tracker`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  // Wait for the "Loading applications…" placeholder to be replaced. The
  // kanban column labels render in a <div>, not a heading, and the most
  // reliable post-fetch signal is either a card link or the per-column
  // empty-state ("no applications…") text. The user has at least one app
  // (asserted by the API probe), so a card link is the right signal here.
  // If that ever fails for an empty user, fall back to the column label
  // text (`getByText('Applied', { exact: true })`).
  await page
    .locator("a[href^='/applications/']")
    .first()
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "tracker.png"),
    animations: "disabled",
  });
  console.log("  -> tracker.png");

  // /applications/[id] — click the first card on the (now loaded) tracker, or
  // create one via the google-fixture mock if the user has no applications.
  console.log("application detail");
  const card = page.locator("a[href^='/applications/']").first();
  if ((await card.count()) === 0) {
    await page.getByRole("button", { name: /Add application/i }).click();
    await page
      .getByLabel(/Job posting URL/i)
      .fill(`${BASE_URL}/api/test-mock/google-fixture`);
    await page.getByRole("button", { name: /Extract \+ create/i }).click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/, { timeout: 60_000 });
  } else {
    await card.click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/, { timeout: 120_000 });
  }
  await settle(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "application.png"),
    animations: "disabled",
  });
  console.log("  -> application.png");

  await ctx.close();
  await browser.close();
  console.log(`done -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
