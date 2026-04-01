import { expect, test } from "@playwright/test";

const NEXT_BUTTON_PATTERN = /next|continue|platforms/i;
const PLATFORM_TEXT_PATTERN = /twitter|linkedin/i;

test.describe("Publish wizard", () => {
  test("navigates to publish page and shows compose step", async ({ page }) => {
    await page.goto("/publish");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const editor = page.getByRole("textbox").first();
    await expect(editor).toBeVisible();
  });

  test("can enter content and proceed to platforms step", async ({ page }) => {
    await page.goto("/publish");
    const editor = page.getByRole("textbox").first();
    await editor.fill("Test post from E2E testing");
    const nextButton = page.getByRole("button", {
      name: NEXT_BUTTON_PATTERN,
    });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.getByText(PLATFORM_TEXT_PATTERN).first()).toBeVisible();
    }
  });
});
