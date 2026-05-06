import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("variants has no axe violations", async ({ page }) => {
  await page.goto("/variants");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/variants");
});
