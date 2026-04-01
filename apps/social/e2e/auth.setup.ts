import { test as setup } from "@playwright/test";

const AUTH_FILE = ".auth/user.json";
const EMAIL_LABEL = /email/i;
const PASSWORD_LABEL = /password/i;
const SIGN_IN_BUTTON = /sign in|log in/i;

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(EMAIL_LABEL).fill("admin@allonfire.com");
  await page.getByLabel(PASSWORD_LABEL).fill("password123");
  await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});
