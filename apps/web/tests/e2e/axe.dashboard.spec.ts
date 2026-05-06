import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("dashboard has no axe violations", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/dashboard");
});
