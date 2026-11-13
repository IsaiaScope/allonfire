import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Locator, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import {
  NAVIGATION,
  sidebarParam,
} from "../src/features/navigation/constants/navigation";
import {
  SECTION,
  type SECTIONS,
} from "../src/features/navigation/constants/sections";
import { sectionHref } from "../src/features/navigation/utils/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import {
  onPhone,
  openAccountMenu,
  openSidebar,
  SIGN_IN_URL,
  signIn,
  signInAsAdmin,
} from "./pages";

const t = EN.Navigation;
const ITALIAN = "it";
/** Named in itself; WebKit capitalises it ("Italiano"). */
const ITALIAN_NAME = new RegExp(`^${languageName(ITALIAN)}$`, "i");
/** A filtered list's address, which switching language must keep. */
const QUERY = `${USER.PARAM.SEARCH}=isa`;
/** A background with nothing painted. */
const TRANSPARENT = "rgba(0, 0, 0, 0)";

/** The menu on screen: the sidebar, or the drawer on a phone. */
const menuOf = (page: Page) =>
  page.getByRole("navigation", { name: t.menu }).filter({ visible: true });

/** Clicks `link` in the menu on screen and checks the page `path` opened is the one marked. */
const clickAndCheck = async (page: Page, link: Locator, path: string) => {
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${sectionHref(path)}$`));
  await openSidebar(page);
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(menuOf(page).locator('[aria-current="page"]')).toHaveCount(1);
  if (onPhone(page)) {
    await page.keyboard.press("Escape");
  }
};

/** Clicks a Section in the menu on screen and checks it is the one marked. */
const visit = async (page: Page, section: (typeof SECTIONS)[number]) => {
  await openSidebar(page);
  await clickAndCheck(
    page,
    menuOf(page).getByRole("link", { name: t[section.label] }),
    section.path
  );
};

/**
 * Opens the Storage group and clicks its Images page: a Section with pages is
 * a row that opens its sub-menu, so the page is the link and the one marked.
 */
const visitImages = async (page: Page) => {
  await openSidebar(page);
  await menuOf(page).getByRole("button", { name: t.storage }).click();
  await clickAndCheck(
    page,
    menuOf(page).getByRole("link", { name: t.images }),
    BACK_OFFICE.PAGE.STORAGE_IMAGES
  );
};

test("moves between the Sections and marks the one you are on", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await visit(page, SECTION.USERS);
  await visitImages(page);
  await visit(page, SECTION.HOME);
});

test("switching language stays on the Section, query included", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(`${SECTION.USERS.path}?${QUERY}`);
  await openAccountMenu(page);
  await page.getByRole("menuitemradio", { name: ITALIAN_NAME }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${ITALIAN}${SECTION.USERS.path}\\?${QUERY}$`)
  );
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

test.describe("before the page runs", () => {
  // The PWA's worker would answer the App's scripts itself, past `route`.
  test.use({ serviceWorkers: "block" });

  test("a page opened with the menu folded shows the unfold icon from its first paint", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    // No script of the App's runs: only the inline one that paints the fold,
    // so what is on screen is the first paint, before hydration.
    let blocked = 0;
    await page.route("**/_next/static/**", (route) => {
      if (route.request().resourceType() !== "script") {
        return route.continue();
      }
      blocked += 1;
      return route.abort();
    });
    await page.goto(
      `${sectionHref(SECTION.USERS.path)}?${NAVIGATION.PARAM.SIDEBAR}=${sidebarParam.serialize(false)}`
    );
    // The App's own scripts really did not run.
    expect(blocked).toBeGreaterThan(0);
    const trigger = page.getByRole("button", { name: t.toggleMenu });
    await expect(
      trigger.locator(".tabler-icon-layout-sidebar-left-expand")
    ).toBeVisible();
    await expect(
      trigger.locator(".tabler-icon-layout-sidebar-left-collapse")
    ).toBeHidden();
    // Not lit as if the menu were open: the page's HTML says it is open
    // (`aria-expanded`) until the page runs.
    await expect(trigger).toHaveCSS("background-color", TRANSPARENT);
  });
});
