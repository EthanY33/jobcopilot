import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("profile has no axe violations", async ({ page }) => {
  await page.goto("/profile");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/profile");
});
