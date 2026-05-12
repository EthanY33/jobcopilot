import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

// Marketing landing renders for unauthenticated visitors at /, so
// override the default authed storageState used by the chromium project.
test.use({ storageState: { cookies: [], origins: [] } });

test("marketing landing has no axe violations", async ({ page }) => {
  await page.goto("/");
  // Marketing page has CSS animations; wait for networkidle (fonts, etc.) but
  // don't wait for animations to "stop" — they're infinite.
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/");
});
