import { fileURLToPath } from "node:url";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { E2E } from "@allonfire/config/tests/e2e/run";
import {
  appRoutes,
  notch,
  outsideSafeArea,
  SAFE_AREA,
  type SafeAreaInsets,
} from "@allonfire/config/tests/e2e/safe-area";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import { SECTIONS } from "../src/features/navigation/constants/sections";
import { sectionHref } from "../src/features/navigation/utils/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import {
  onPhone,
  openSidebar,
  rowOf,
  signInAsAdmin,
  usersSearchHref,
} from "./pages";

/**
 * Every page of the App, found from `src/app` (a new one joins on its own),
 * keeps its text and controls inside the safe area on a notched phone held
 * upright, turned sideways and turned after loading.
 */

/** Each page's address, under the default language (`/[locale]` dropped). */
const LOCALE = /^\/\[locale\]/;
/** The route group whose pages are behind sign-in. */
const SIGNED_IN = "signed-in";

/** A User's page: its address is the list's link to them. */
const userPath = async (page: Page) => {
  const { email } = FIXTURE.USER.NO_MEMBERSHIP;
  await page.goto(usersSearchHref(email));
  return (
    (await rowOf(page, email).getByRole("link").getAttribute("href")) ?? ""
  );
};

/** An address for each page whose path has a param; a new one fails until
 *  it has its own here. */
const ADDRESS: Record<string, (page: Page) => Promise<string> | string> = {
  // Nothing serves it: the not-found page.
  "/[...rest]": () => "/no-such-page",
  [`${BACK_OFFICE.PAGE.USERS}/[id]`]: userPath,
};

const PAGES = appRoutes(
  fileURLToPath(new URL("../src/app", import.meta.url))
).map(({ groups, path }) => ({
  path: path.replace(LOCALE, "") || "/",
  signedIn: groups.includes(SIGNED_IN),
}));

const SCREENS = [
  {
    insets: SAFE_AREA.INSETS.UPRIGHT,
    name: "upright",
    size: SCREEN.VIEWPORT.PHONE,
  },
  {
    insets: SAFE_AREA.INSETS.SIDEWAYS,
    name: "sideways",
    size: SCREEN.VIEWPORT.PHONE_LANDSCAPE,
  },
] as const;

const viewport = ({ HEIGHT, WIDTH }: { HEIGHT: number; WIDTH: number }) => ({
  height: HEIGHT,
  width: WIDTH,
});

/** What is past the safe area; a page still redirecting (a Section opens
 *  its first page) is checked again once it lands. */
const NAVIGATING = ["the page is still navigating"];
const outside = (page: Page, insets: SafeAreaInsets) =>
  outsideSafeArea(page, insets).catch(() => NAVIGATING);

/** Checks the page, then its menu drawer where the menu is one. */
const expectSafe = async (
  page: Page,
  insets: SafeAreaInsets,
  signedIn: boolean
) => {
  await expect.poll(() => outside(page, insets)).toEqual([]);
  if (signedIn && onPhone(page)) {
    await openSidebar(page);
    await expect.poll(() => outside(page, insets)).toEqual([]);
    await page.keyboard.press("Escape");
  }
};

const CHROMIUM = { tag: E2E.TAG.CHROMIUM_ONLY };

test("finds the App's pages", CHROMIUM, () => {
  expect(PAGES.map(({ path }) => path)).toContain(AUTH.PAGE.SIGN_IN);
});

for (const { insets, name, size } of SCREENS) {
  for (const { path, signedIn } of PAGES) {
    test(
      `${path} keeps clear of the notch ${name}`,
      CHROMIUM,
      async ({ page }) => {
        const address = path.includes("[") ? ADDRESS[path] : () => path;
        expect(address, `no address for ${path} in ADDRESS`).toBeDefined();
        await page.setViewportSize(viewport(size));
        await notch(page, insets);
        if (signedIn) {
          await signInAsAdmin(page);
        }
        await page.goto((await address?.(page)) ?? path);
        await expectSafe(page, insets, signedIn);
      }
    );
  }
}

test(
  "a page loaded upright keeps clear of the notch once turned sideways",
  CHROMIUM,
  async ({ page }) => {
    await page.setViewportSize(viewport(SCREEN.VIEWPORT.PHONE));
    await notch(page, SAFE_AREA.INSETS.UPRIGHT);
    await signInAsAdmin(page);
    await page.goto(sectionHref(SECTIONS[0].path));
    await page.setViewportSize(viewport(SCREEN.VIEWPORT.PHONE_LANDSCAPE));
    await notch(page, SAFE_AREA.INSETS.SIDEWAYS);
    await expectSafe(page, SAFE_AREA.INSETS.SIDEWAYS, true);
  }
);
