import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofTranslators } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import type { AppDescriptor } from "../../../navigation/types/app-descriptor";
import { aofAppPages } from "./app-pages";

const { SignIn: SIGN_IN_EN } = SHARED_TRANSLATIONS.en.Common.Auth;
const { en: t, it: itT } = aofTranslators({ en: {}, it: {} });
const { openAccountMenu, SIGN_IN_URL, signIn } = aofAppPages();

/** A Fixture User, as `signIn` takes it. */
type Visitor = { email: string };

type Options = {
  /** Users the App lets in: each signs in and lands home. */
  allowed: readonly [Visitor, ...Visitor[]];
  app: AppDescriptor;
  /** The App's address, as the browser reaches it. */
  baseUrl: string;
  /** What names Home on screen (its heading), in English. */
  homeHeading: string;
  /** The User whose refusal is read in Italian too. */
  italianRefused: Visitor;
  /** Users the App turns away with `Common.Auth.SignIn.error.forbidden`. */
  refused: readonly [Visitor, ...Visitor[]];
};

// Next's route announcer is an `alert` too: read the form's own.
const formAlert = (page: Page, submit: string) =>
  page.getByRole("form", { name: submit }).getByRole("alert");

/**
 * The sign-in flow every App has, as Playwright tests: who gets in and lands
 * home, who is refused, a wrong password, signing out, the form's own checks.
 * Call it from the App's `e2e/sign-in.spec.ts`. Every test signs in from one
 * address: the e2e preset raises the auth limit for its API, so retries never
 * meet it.
 */
export const signInSuite = ({
  allowed,
  app,
  baseUrl,
  homeHeading,
  italianRefused,
  refused,
}: Options) => {
  // Home is `/`; the locale middleware can answer it as `/en`.
  const homeUrl = new RegExp(`^${baseUrl}/(en)?${AUTH.PAGE.HOME}$`);
  const [first] = allowed;
  const homeIsShown = (page: Page) =>
    expect(
      page.getByRole("heading", { name: homeHeading }).filter({ visible: true })
    ).toBeVisible();

  for (const user of allowed) {
    test(`${user.email} signs in, lands home, and stays signed in after a reload`, async ({
      page,
    }) => {
      await signIn(page, user);
      await expect(page).toHaveURL(homeUrl);
      await homeIsShown(page);
      await page.reload();
      await expect(page).toHaveURL(homeUrl);
    });
  }

  test("a signed-in User who opens Sign in is sent home", async ({ page }) => {
    await signIn(page, first);
    await expect(page).toHaveURL(homeUrl);
    await page.goto(AUTH.PAGE.SIGN_IN);
    await expect(page).toHaveURL(homeUrl);
    // The redirect lands client-side: Next may keep a hidden copy of Home.
    await homeIsShown(page);
  });

  for (const user of refused) {
    test(`${user.email} is refused`, async ({ page }) => {
      await signIn(page, user);
      await expect(formAlert(page, SIGN_IN_EN.submit)).toHaveText(
        t("Common.Auth.SignIn.error.forbidden", { app: app.name })
      );
      await expect(page).toHaveURL(SIGN_IN_URL);
    });
  }

  test("a wrong password is refused", async ({ page }) => {
    await signIn(page, first, { password: "wrong-password-1" });
    await expect(formAlert(page, SIGN_IN_EN.submit)).toHaveText(
      SIGN_IN_EN.error.invalid
    );
  });

  test("signing out returns to sign-in and keeps home closed", async ({
    page,
  }) => {
    await signIn(page, first);
    await expect(page).toHaveURL(homeUrl);
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
    await signIn(page, italianRefused, { locale: "it" });
    await expect(
      formAlert(page, SHARED_TRANSLATIONS.it.Common.Auth.SignIn.submit)
    ).toHaveText(itT("Common.Auth.SignIn.error.forbidden", { app: app.name }));
  });

  test("an empty Sign in says what each field needs, and stays", async ({
    page,
  }) => {
    await page.goto(AUTH.PAGE.SIGN_IN);
    await page.getByRole("button", { name: SIGN_IN_EN.submit }).click();
    await expect(page.getByText(SIGN_IN_EN.field.emailRequired)).toBeVisible();
    await expect(
      page.getByText(SIGN_IN_EN.field.passwordRequired)
    ).toBeVisible();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });

  test("an email that is not one says so, and stays", async ({ page }) => {
    await page.goto(AUTH.PAGE.SIGN_IN);
    await page
      .getByLabel(SIGN_IN_EN.email, { exact: true })
      .fill("not-an-email");
    await page
      .getByLabel(SIGN_IN_EN.password, { exact: true })
      .fill(FIXTURE.PASSWORD);
    await page.getByRole("button", { name: SIGN_IN_EN.submit }).click();
    await expect(page.getByText(SIGN_IN_EN.field.emailInvalid)).toBeVisible();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });
};
