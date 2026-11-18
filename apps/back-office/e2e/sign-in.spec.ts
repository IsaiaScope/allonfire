import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { AUTH_EN, AUTH_IT } from "../src/shared/tests/auth-words";
import { openAccountMenu, SIGN_IN_URL, signIn } from "./pages";

// Home is `/`; the locale middleware can answer it as `/en`.
const HOME_URL = new RegExp(
  `^${LOCAL.URL.BACK_OFFICE_E2E}/(en)?${AUTH.PAGE.HOME}$`
);

type Translations = typeof AUTH_EN;

// Next's route announcer is an `alert` too: read the form's own.
const formAlert = (page: Page, t: Translations = AUTH_EN) =>
  page.getByRole("form", { name: t.SignIn.submit }).getByRole("alert");

// Every test signs in from one address: the e2e preset raises the auth limit
// for its API, so retries never meet it.
test("an Admin signs in, lands home, and stays signed in after a reload", async ({
  page,
}) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await expect(
    page.getByRole("heading", { name: BACK_OFFICE.name })
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(HOME_URL);
});

test("a signed-in Admin who opens Sign in is sent home", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await page.goto(AUTH.PAGE.SIGN_IN);
  await expect(page).toHaveURL(HOME_URL);
  // The redirect lands client-side: Next may keep a hidden copy of Home.
  await expect(
    page
      .getByRole("heading", { name: BACK_OFFICE.name })
      .filter({ visible: true })
  ).toBeVisible();
});

for (const user of [
  FIXTURE.USER.BACK_OFFICE.USER,
  FIXTURE.USER.BACK_OFFICE.VIEWER,
  FIXTURE.USER.NO_MEMBERSHIP,
]) {
  test(`${user.email} is refused`, async ({ page }) => {
    await signIn(page, user);
    await expect(formAlert(page)).toHaveText(
      AUTH_EN.SignIn.error.forbidden.replace("{app}", BACK_OFFICE.name)
    );
    await expect(page).toHaveURL(SIGN_IN_URL);
  });
}

test("a wrong password is refused", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN, {
    password: "wrong-password-1",
  });
  await expect(formAlert(page)).toHaveText(AUTH_EN.SignIn.error.invalid);
});

test("signing out returns to sign-in and keeps home closed", async ({
  page,
}) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await openAccountMenu(page);
  await page
    .getByRole("menuitem", {
      name: SHARED_TRANSLATIONS.en.Common.Navigation.signOut,
    })
    .click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  // The browser kept the signed-in pages a while: Back must not show them.
  await page.goBack();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("Italian sign-in shows the refusal in Italian", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.USER, { locale: "it" });
  await expect(formAlert(page, AUTH_IT)).toHaveText(
    AUTH_IT.SignIn.error.forbidden.replace("{app}", BACK_OFFICE.name)
  );
});

test("an empty Sign in says what each field needs, and stays", async ({
  page,
}) => {
  await page.goto(AUTH.PAGE.SIGN_IN);
  await page.getByRole("button", { name: AUTH_EN.SignIn.submit }).click();
  await expect(
    page.getByText(AUTH_EN.SignIn.field.emailRequired)
  ).toBeVisible();
  await expect(
    page.getByText(AUTH_EN.SignIn.field.passwordRequired)
  ).toBeVisible();
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("an email that is not one says so, and stays", async ({ page }) => {
  await page.goto(AUTH.PAGE.SIGN_IN);
  await page
    .getByLabel(AUTH_EN.SignIn.email, { exact: true })
    .fill("not-an-email");
  await page
    .getByLabel(AUTH_EN.SignIn.password, { exact: true })
    .fill(FIXTURE.PASSWORD);
  await page.getByRole("button", { name: AUTH_EN.SignIn.submit }).click();
  await expect(page.getByText(AUTH_EN.SignIn.field.emailInvalid)).toBeVisible();
  await expect(page).toHaveURL(SIGN_IN_URL);
});
