import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";
import { E2E_FIXTURE_URL } from "./e2e-guards";

test("applications/[id] has no axe violations", async ({ page }) => {
  // Land on tracker, click any existing card. If none exist, create via the
  // mock fixture (mirrors google-referral.spec.ts setup).
  await page.goto("/tracker");
  const card = page.locator("[href^='/applications/']").first();
  if (await card.count() === 0) {
    await page.getByRole("button", { name: /Add application/i }).click();
    await page.getByLabel(/Job posting URL/i).fill(E2E_FIXTURE_URL);
    await page.getByRole("button", { name: /Extract \+ create/i }).click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/, { timeout: 30_000 });
  } else {
    await card.click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/);
  }
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/applications/[id]");
});
