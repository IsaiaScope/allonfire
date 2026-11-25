import { HTTP } from "@allonfire/core/features/http/constants/http";
import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { NAVIGATION } from "../../../navigation/constants/navigation";
import type {
  AppDescriptor,
  AppSection,
} from "../../../navigation/types/app-descriptor";
import { sectionHref } from "../../../navigation/utils/sections";
import { sidebarParam } from "../../../navigation/utils/sidebar-param";
import { aofAppPages } from "./app-pages";

const common = SHARED_TRANSLATIONS.en.Common.Navigation;
const ITALIAN = "it";
/** Named in itself; WebKit capitalises it ("Italiano"). */
const ITALIAN_NAME = new RegExp(`^${languageName(ITALIAN)}$`, "i");
/** A background with nothing painted. */
const TRANSPARENT = "rgba(0, 0, 0, 0)";

const {
  onPhone,
  openAccountMenu,
  openSidebar,
  SIGN_IN_URL,
  signIn,
  signInAndWait,
} = aofAppPages();

type Options = {
  /** The Admin the suite signs in as: sees every Section. */
  admin: { email: string };
  app: AppDescriptor;
  /**
   * A page whose address carries a query, which switching language must
   * keep (`query` is empty for a page with none).
   */
  languageProbe: { path: string; query: string };
  /** The App's own `Navigation` words in English: each label's text. */
  navigation: Readonly<Record<string, string>>;
};

/** One page of the menu: a Section's row, or a page under a Section's. */
type Stop = {
  /** The Section whose sub-menu holds the page; none for a plain Section. */
  group?: AppSection;
  label: string;
  path: string;
};

const stopsOf = (section: AppSection): Stop[] =>
  section.pages?.map(({ label, path }) => ({
    group: section,
    label,
    path,
  })) ?? [section];

/** Runs `step` on each item, one after the other. */
const inOrder = <T>(items: readonly T[], step: (item: T) => Promise<void>) =>
  items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());

/** The menu on screen: the sidebar, or the drawer on a phone. */
const menuOf = (page: Page) =>
  page.getByRole("navigation", { name: common.menu }).filter({ visible: true });

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

/**
 * The frame every signed-in App wears, as Playwright tests: moving between
 * Sections and their pages with the current one marked, the language switch,
 * the header, signing out, the proxy's answer to a signed-out visit and the
 * menu's first paint. Call it from the App's `e2e/frame.spec.ts`.
 */
export const frameSuite = ({
  admin,
  app,
  languageProbe,
  navigation,
}: Options) => {
  const word = (label: string) => navigation[label] ?? label;
  const stops = app.sections.flatMap(stopsOf);

  /**
   * Opens a Section's sub-menu when it is shut: a Section with pages is a row
   * that opens it, and the page is the link and the one marked.
   */
  const openSubMenu = async (page: Page, section: AppSection) => {
    const row = menuOf(page).getByRole("button", { name: word(section.label) });
    if ((await row.getAttribute("aria-expanded")) === "false") {
      await row.click();
    }
  };

  /**
   * Opens `stop`'s menu (its Section's sub-menu too, for a page) and checks
   * the page it leads to is the one marked.
   */
  const visit = async (page: Page, stop: Stop) => {
    await openSidebar(page);
    if (stop.group) {
      await openSubMenu(page, stop.group);
    }
    await clickAndCheck(
      page,
      menuOf(page).getByRole("link", { name: word(stop.label) }),
      stop.path
    );
  };

  test("moves between the Sections and marks the one you are on", async ({
    page,
  }) => {
    await signInAndWait(page, admin);
    // Each page in the menu's order, then back to the first.
    await inOrder([...stops, ...stops.slice(0, 1)], (stop) =>
      visit(page, stop)
    );
  });

  test("switching language stays on the page, query included", async ({
    page,
  }) => {
    const { path, query } = languageProbe;
    await signInAndWait(page, admin);
    await page.goto(query ? `${path}?${query}` : path);
    await openAccountMenu(page);
    await page.getByRole("menuitemradio", { name: ITALIAN_NAME }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${ITALIAN}${path}${query ? `\\?${query}` : ""}$`)
    );
  });

  test(`the sidebar's header names ${app.name} as the App you are in`, async ({
    page,
  }) => {
    await signInAndWait(page, admin);
    await openSidebar(page);
    // The switcher lists only the other Apps, so the App is named on its
    // button (or, with no other App, on the header alone), never in a menu.
    await expect(
      page.locator('[data-sidebar="header"]').filter({ visible: true })
    ).toContainText(app.name);
    await expect(page.getByRole("menuitem", { name: app.name })).toHaveCount(0);
  });

  test("signs out from the account menu", async ({ page }) => {
    await signIn(page, admin);
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: common.signOut }).click();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });

  test("a signed-out visit to a Section is sent to Sign in before any page", async ({
    request,
  }) => {
    const responses = await Promise.all(
      app.sections.map((section) =>
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
      await signInAndWait(page, admin);
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
        `${sectionHref(app.sections[0].path)}?${NAVIGATION.PARAM.SIDEBAR}=${sidebarParam.serialize(false)}`
      );
      // The App's own scripts really did not run.
      expect(blocked).toBeGreaterThan(0);
      const trigger = page.getByRole("button", { name: common.toggleMenu });
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
};
