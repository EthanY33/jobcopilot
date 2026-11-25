import { test, expect } from "@playwright/test";
import { E2E_EMAIL, E2E_FIXTURE_URL } from "./e2e-guards";
import { resetFixtureState } from "./reset-fixture-state";

test.beforeEach(async () => {
  // Hermetic: without this, a second run hits the dedupe branch, the editor is
  // pre-filled with the old letter and the card is already Applied.
  await resetFixtureState(E2E_EMAIL, E2E_FIXTURE_URL);
});

test("ship criterion: apply to Google YouTube referral end-to-end", async ({ page }) => {
  // The dev server has ANTHROPIC_BASE_URL pointed at the in-app mock
  // (see playwright.config.ts → webServer.env). The scraper hits the
  // in-app fixture endpoint instead of careers.google.com.
  const fixtureUrl = E2E_FIXTURE_URL;

  await page.goto("/tracker");
  await page.getByRole("button", { name: /Add application/i }).click();
  await page.getByLabel(/Job posting URL/i).fill(fixtureUrl);
  // The dialog button is labeled "Extract + create"; "Extracting..." is the
  // busy state. Match the idle label exactly.
  const extractResp = page.waitForResponse(
    (r) => r.url().includes("/api/postings/extract") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Extract \+ create/i }).click();
  expect((await extractResp).ok()).toBe(true);

  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Applications Engineer/i }),
  ).toBeVisible();

  // Cover letter tab — TabsTrigger renders as a button with role="tab".
  await page.getByRole("tab", { name: /Cover Letter/i }).click();
  // State was reset, so this is a first draft: the CTA must read "Draft" and
  // the letter must not be on screen yet.
  await expect(page.getByText(/Dear Google team/i)).toHaveCount(0);
  const draftResp = page.waitForResponse(
    (r) =>
      r.url().includes("/draft-cover-letter") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^Draft$/ }).click();
  expect((await draftResp).ok()).toBe(true);
  await expect(page.getByText(/Dear Google team/i)).toBeVisible({
    timeout: 30_000,
  });

  // Finalize the cover letter.
  const finalizeResp = page.waitForResponse(
    (r) =>
      r.url().includes("/draft-cover-letter") && r.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: /^Finalize$/ }).click();
  expect((await finalizeResp).ok()).toBe(true);
  // The "Finalized" pill renders inside the editor section header after
  // saving with finalized=true.
  await expect(page.getByText(/^Finalized$/i).first()).toBeVisible();

  // Move card to Applied via API (DnD is fragile; the ship criterion is the
  // application-flow path, not the kanban interaction).
  const move = await page.evaluate(async () => {
    const apps = await fetch("/api/applications").then((r) => r.json());
    const target = apps[0];
    const before: string = target.status;
    const resp = await fetch(`/api/applications/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    return { before, ok: resp.ok };
  });
  expect(move.before).not.toBe("applied");
  expect(move.ok).toBe(true);

  await page.goto("/tracker");
  // The kanban renders one column per status with a header text matching the
  // status label exactly ("Applied"). There's no stable id on the column
  // container; locate the smallest ancestor that contains both the
  // column-header label and the application's title.
  await expect(page.getByText("Applied").first()).toBeVisible();
  const appliedHeader = page
    .locator("div.uppercase", { hasText: /^Applied$/ })
    .first();
  // Walk to the column root: header is wrapped in a flex header div, which
  // sits inside the column root (min-w-[200px] space-y-2).
  const appliedColumn = appliedHeader.locator("xpath=ancestor::div[2]");
  await expect(
    appliedColumn.getByText(/Applications Engineer/i),
  ).toBeVisible();
});
