import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("tracker has no axe violations", async ({ page }) => {
  await page.goto("/tracker");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/tracker");
});
