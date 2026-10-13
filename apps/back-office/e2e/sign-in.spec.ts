import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};
import { SIGN_IN_URL } from "./pages";

// Home is `/`; the locale middleware can answer it as `/en`.
const HOME_URL = new RegExp(
  `^${LOCAL.URL.BACK_OFFICE_E2E}/(en)?${AUTH.PAGE.HOME}$`
);

type Translations = typeof EN;

// Next's route announcer is an `alert` too: read the form's own.
const formAlert = (page: Page, t: Translations = EN) =>
  page.getByRole("form", { name: t.SignIn.submit }).getByRole("alert");

/**
 * Fills the sign-in form of `locale` (the default, English, without one) as
 * `user`, with the Fixture password unless told otherwise.
 */
const signIn = async (
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

// Every test signs in from one address: the e2e preset raises the auth limit
// for its API, so retries never meet it.
test("an Admin signs in, lands home, and stays signed in after a reload", async ({
  page,
}) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await expect(page.getByText(EN.Home.description)).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(HOME_URL);
});

for (const user of [
  FIXTURE.USER.BACK_OFFICE.USER,
  FIXTURE.USER.BACK_OFFICE.VIEWER,
  FIXTURE.USER.NO_MEMBERSHIP,
]) {
  test(`${user.email} is refused`, async ({ page }) => {
    await signIn(page, user);
    await expect(formAlert(page)).toHaveText(EN.SignIn.error.forbidden);
    await expect(page).toHaveURL(SIGN_IN_URL);
  });
}

test("a wrong password is refused", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN, {
    password: "wrong-password-1",
  });
  await expect(formAlert(page)).toHaveText(EN.SignIn.error.invalid);
});

test("signing out returns to sign-in and keeps home closed", async ({
  page,
}) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await page.getByRole("button", { name: EN.Home.signOut }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("Italian sign-in shows the refusal in Italian", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.USER, { locale: "it" });
  await expect(formAlert(page, IT)).toHaveText(IT.SignIn.error.forbidden);
});
