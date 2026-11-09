import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};

const t = EN.ForgotPassword;

/** Asks for a reset link for `email`, then reads the one answer every address gets. */
const askFor = async (page: Page, email: string) => {
  await page.goto(AUTH.PAGE.FORGOT_PASSWORD);
  await page.getByLabel(t.email).fill(email);
  await page.getByRole("button", { name: t.submit }).click();
  await expect(page.getByRole("status")).toHaveText(t.note.sent);
};

test("Sign in leads to Forgot password, which answers the same for any address", async ({
  page,
}) => {
  await page.goto(AUTH.PAGE.SIGN_IN);
  await page.getByRole("link", { name: EN.SignIn.forgot }).click();
  await expect(page.getByRole("heading", { name: t.title })).toBeVisible();
  await askFor(page, FIXTURE.USER.BACK_OFFICE.ADMIN.email);
  await askFor(page, "nobody-at-all@reset.allonfire.test");
});

test("a reset link that no longer works offers a new one", async ({ page }) => {
  await page.goto(
    `${AUTH.PAGE.RESET_PASSWORD}?${AUTH.MAIL.TOKEN_PARAM}=not-a-token`
  );
  const reset = EN.ResetPassword;
  await page
    .getByLabel(reset.password, { exact: true })
    .fill(FIXTURE.NEW_PASSWORD);
  await page
    .getByLabel(reset.confirmPassword, { exact: true })
    .fill(FIXTURE.NEW_PASSWORD);
  await page.getByRole("button", { name: reset.submit }).click();
  await expect(page.getByRole("link", { name: reset.askAgain })).toBeVisible();
});
