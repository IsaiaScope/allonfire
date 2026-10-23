import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};

/** Any locale's Sign in page. */
export const SIGN_IN_URL = new RegExp(`${AUTH.PAGE.SIGN_IN}$`);

/** Below Tailwind's `md` the sidebar is a drawer behind the menu button. */
const DESKTOP_WIDTH = SCREEN.BREAKPOINT.MD;

/** Whether the page is as narrow as a phone, where the sidebar is a drawer. */
export const onPhone = (page: Page) =>
  (page.viewportSize()?.width ?? DESKTOP_WIDTH) < DESKTOP_WIDTH;

/**
 * Puts the sidebar on screen: on a phone, opens its drawer first, once any
 * earlier one has finished closing. A tap that lands before the page has
 * hydrated opens nothing, so it taps again until the drawer is open.
 */
export const openSidebar = async (page: Page) => {
  if (!onPhone(page)) {
    return;
  }
  // Base UI marks the drawer `data-open`, and `data-closed` while it slides
  // shut: a closing drawer is still visible, but about to leave.
  await expect(page.locator('[role="dialog"][data-closed]')).toHaveCount(0);
  const drawer = page.locator('[role="dialog"][data-open]');
  await expect(async () => {
    if (!(await drawer.isVisible())) {
      await page
        .getByRole("button", { name: EN.Navigation.toggleMenu })
        .click();
    }
    await expect(drawer).toBeVisible({ timeout: 1000 });
  }).toPass();
};

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
