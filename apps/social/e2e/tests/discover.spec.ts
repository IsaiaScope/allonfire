import { expect, test } from "@playwright/test";

const DISCOVER_TEXT_PATTERN = /no topics|discover/i;
const FILTER_TEXT_PATTERN = /all categories|filter/i;

test.describe("Topic discovery", () => {
  test("loads discover page with topics or empty state", async ({ page }) => {
    await page.goto("/discover");
    await expect(
      page
        .getByRole("heading", { level: 1 })
        .or(page.getByText(DISCOVER_TEXT_PATTERN))
    ).toBeVisible();
  });

  test("shows category filter controls", async ({ page }) => {
    await page.goto("/discover");
    await expect(
      page.getByRole("combobox").or(page.getByText(FILTER_TEXT_PATTERN).first())
    ).toBeVisible();
  });
});
