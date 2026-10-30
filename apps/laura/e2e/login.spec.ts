import { expect, test } from "@playwright/test";

test("an anonymous visitor lands on the login form", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
