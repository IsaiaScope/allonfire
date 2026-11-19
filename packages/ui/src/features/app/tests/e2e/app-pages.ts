import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page } from "@playwright/test";

const { Auth, Navigation } = SHARED_TRANSLATIONS.en.Common;

/** Below Tailwind's `md` the sidebar is a drawer behind the menu button. */
const DESKTOP_WIDTH = SCREEN.BREAKPOINT.MD;

/**
 * The e2e helpers every App's specs share: its pages are the frame and the
 * Sign in form, whose words are core's `Common` text (never an App's), so
 * nothing here varies per App. An App's `e2e/pages.ts` destructures what it
 * uses and adds its own.
 */
export const aofAppPages = () => {
  /** Whether the page is as narrow as a phone, where the sidebar is a drawer. */
  const onPhone = (page: Page) =>
    (page.viewportSize()?.width ?? DESKTOP_WIDTH) < DESKTOP_WIDTH;

  /**
   * Puts the sidebar on screen: on a phone, opens its drawer first, once any
   * earlier one has finished closing. A tap that lands before the page has
   * hydrated opens nothing, so it taps again until the drawer is open.
   */
  const openSidebar = async (page: Page) => {
    if (!onPhone(page)) {
      return;
    }
    // Base UI marks the drawer `data-open`, and `data-closed` while it slides
    // shut: a closing drawer is still visible, but about to leave.
    await expect(page.locator('[role="dialog"][data-closed]')).toHaveCount(0);
    const drawer = page.locator('[role="dialog"][data-open]');
    await expect(async () => {
      if (!(await drawer.isVisible())) {
        await page.getByRole("button", { name: Navigation.toggleMenu }).click();
      }
      await expect(drawer).toBeVisible({ timeout: 1000 });
    }).toPass();
  };

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
    const t = locale === "it" ? SHARED_TRANSLATIONS.it.Common.Auth : Auth;
    await page.goto(
      locale ? `/${locale}${AUTH.PAGE.SIGN_IN}` : AUTH.PAGE.SIGN_IN
    );
    await page.getByLabel(t.SignIn.email).fill(email);
    await page.getByLabel(t.SignIn.password, { exact: true }).fill(password);
    await page.getByRole("button", { name: t.SignIn.submit }).click();
  };

  /** Signs in as `user` and waits for the frame: Sign in submits without
   *  waiting, so a `goto` right after could beat its cookie. */
  const signInAndWait = async (page: Page, user: { email: string }) => {
    await signIn(page, user);
    await expect(
      page.getByRole("button", { name: Navigation.toggleMenu })
    ).toBeVisible();
  };

  /**
   * Taps a sidebar link by its name. A phone's drawer brings its links into
   * view only on opening, and the link's prefetch runs inside an `instant`
   * lock: waiting for the network to settle lets the prefetch land before the
   * tap.
   */
  const tapSidebarLink = async (page: Page, name: string) => {
    await openSidebar(page);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("navigation", { name: Navigation.menu })
      .filter({ visible: true })
      .getByRole("link", { name })
      .click();
  };

  /** Opens the account menu, in the sidebar: a drawer on a phone. */
  const openAccountMenu = async (page: Page) => {
    await openSidebar(page);
    await page
      .getByRole("button", { name: Navigation.account })
      .filter({ visible: true })
      .click();
  };

  return {
    onPhone,
    openAccountMenu,
    openSidebar,
    /** Any locale's Sign in page. */
    SIGN_IN_URL: new RegExp(`${AUTH.PAGE.SIGN_IN}$`),
    signIn,
    signInAndWait,
    tapSidebarLink,
  };
};
