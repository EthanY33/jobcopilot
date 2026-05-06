import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test.use({ storageState: { cookies: [], origins: [] } });

test("login has no axe violations", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/login");
});
