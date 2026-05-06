import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect.soft(
    results.violations,
    `axe violations on ${label}:\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
}
