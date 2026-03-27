import { expect, test } from "@playwright/test";

const ADMIN_URL_PATTERN = /\/admin/;
const ADMIN_TEXT_PATTERN = /users|admin/i;

test.describe("Admin section", () => {
  test("admin user can access admin page", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(ADMIN_URL_PATTERN);
    await expect(page.getByText(ADMIN_TEXT_PATTERN).first()).toBeVisible();
  });
});
