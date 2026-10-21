import { HTTP } from "@allonfire/core/features/http/constants/http";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import {
  SECTION,
  type SECTIONS,
  sectionHref,
} from "../src/features/navigation/constants/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { onPhone, openSidebar, SIGN_IN_URL, signIn } from "./pages";

const t = EN.Navigation;
const ITALIAN = "it";

/** The menu on screen: the sidebar, or the drawer on a phone. */
const menuOf = (page: Page) =>
  page.getByRole("navigation", { name: t.menu }).filter({ visible: true });

/** Signs in as the Back Office Admin and waits for the frame: Sign in
 *  submits without waiting, so a `goto` right after could beat its cookie. */
const signInAsAdmin = async (page: Page) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(page.getByRole("button", { name: t.toggleMenu })).toBeVisible();
};

const openAccountMenu = async (page: Page) => {
  await openSidebar(page);
  await page
    .getByRole("button", { name: t.account })
    .filter({ visible: true })
    .click();
};

/** Clicks a Section in the menu on screen and checks it is the one marked. */
const visit = async (page: Page, section: (typeof SECTIONS)[number]) => {
  await openSidebar(page);
  const link = menuOf(page).getByRole("link", { name: t[section.label] });
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${sectionHref(section.path)}$`));
  await openSidebar(page);
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(menuOf(page).locator('[aria-current="page"]')).toHaveCount(1);
  if (onPhone(page)) {
    await page.keyboard.press("Escape");
  }
};

test("moves between the Sections and marks the one you are on", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await visit(page, SECTION.USERS);
  await visit(page, SECTION.STORAGE);
  await visit(page, SECTION.HOME);
});

test("switching language stays on the Section", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(SECTION.USERS.path);
  await openAccountMenu(page);
  await page
    .getByRole("menuitemradio", { exact: true, name: ITALIAN.toUpperCase() })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${ITALIAN}${SECTION.USERS.path}$`));
});

test("the sidebar's header names the Back Office as the App you are in", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await openSidebar(page);
  // The switcher lists only the other Apps, so the Back Office is named on
  // its button (or, with no other App, on the header alone), never in a menu.
  await expect(
    page.locator('[data-sidebar="header"]').filter({ visible: true })
  ).toContainText(BACK_OFFICE.NAME);
  await expect(
    page.getByRole("menuitem", { name: BACK_OFFICE.NAME })
  ).toHaveCount(0);
});

test("signs out from the account menu", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: t.signOut }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("a signed-out visit to a Section is sent to Sign in before any page", async ({
  request,
}) => {
  const responses = await Promise.all(
    [SECTION.USERS, SECTION.STORAGE].map((section) =>
      request.get(`/${ITALIAN}${section.path}`, { maxRedirects: 0 })
    )
  );
  for (const response of responses) {
    expect(response.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
  }
});
