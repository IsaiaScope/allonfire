import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type { Page } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};

/** Any locale's Sign in page. */
export const SIGN_IN_URL = new RegExp(`${AUTH.PAGE.SIGN_IN}$`);

/**
 * Fills the sign-in form of `locale` (the default, English, without one) as
 * `user`, with the Fixture password unless told otherwise.
 */
export const signIn = async (
  page: Page,
  { email }: { email: string },
  {
    locale,
    password = FIXTURE.PASSWORD,
  }: { locale?: "it"; password?: string } = {}
) => {
  const t = locale === "it" ? IT : EN;
  await page.goto(
    locale ? `/${locale}${AUTH.PAGE.SIGN_IN}` : AUTH.PAGE.SIGN_IN
  );
  await page.getByLabel(t.SignIn.email).fill(email);
  await page.getByLabel(t.SignIn.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: t.SignIn.submit }).click();
};
