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
import { openSidebar, SIGN_IN_URL, signIn } from "./pages";

// Home is `/`; the locale middleware can answer it as `/en`.
const HOME_URL = new RegExp(
  `^${LOCAL.URL.BACK_OFFICE_E2E}/(en)?${AUTH.PAGE.HOME}$`
);

type Translations = typeof EN;

// Next's route announcer is an `alert` too: read the form's own.
const formAlert = (page: Page, t: Translations = EN) =>
  page.getByRole("form", { name: t.SignIn.submit }).getByRole("alert");

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

test("a signed-in Admin who opens Sign in is sent home", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await page.goto(AUTH.PAGE.SIGN_IN);
  await expect(page).toHaveURL(HOME_URL);
  // The redirect lands client-side: Next may keep a hidden copy of Home.
  await expect(
    page.getByText(EN.Home.description).filter({ visible: true })
  ).toBeVisible();
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
  // Sign out is in the account menu, in the sidebar: a drawer on a phone.
  await openSidebar(page);
  await page
    .getByRole("button", { name: EN.Navigation.account })
    .filter({ visible: true })
    .click();
  await page.getByRole("menuitem", { name: EN.Navigation.signOut }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  // The browser kept the signed-in pages a while: Back must not show them.
  await page.goBack();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("Italian sign-in shows the refusal in Italian", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.USER, { locale: "it" });
  await expect(formAlert(page, IT)).toHaveText(IT.SignIn.error.forbidden);
});
