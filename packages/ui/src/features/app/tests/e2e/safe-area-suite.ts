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
import { expect, type Page, test } from "@playwright/test";
import { sectionHref } from "../../../navigation/utils/sections";
import { aofAppPages } from "./app-pages";

const { onPhone, openSidebar } = aofAppPages();

/** Each page's address, under the default language (`/[locale]` dropped). */
const LOCALE = /^\/\[locale\]/;
/** The route group whose pages are behind sign-in. */
const SIGNED_IN = "signed-in";

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

type Options = {
  /**
   * An address for each page whose path has a param (`/users/[id]`); a new
   * one fails until it has its own here.
   */
  address: Readonly<Record<string, (page: Page) => Promise<string> | string>>;
  /** The App's `src/app` folder: every page is found from it. */
  appDir: string;
  /** The path of the App's first Section (where the turn test loads). */
  firstSection: string;
  /** Signs in as the User who sees every page, and waits for the frame. */
  signedIn: (page: Page) => Promise<void>;
};

/**
 * Every page of the App, found from `src/app` (a new one joins on its own),
 * keeps its text and controls inside the safe area on a notched phone held
 * upright, turned sideways and turned after loading. Call it from the App's
 * `e2e/safe-area.spec.ts`; only Chromium can draw a notch.
 */
export const safeAreaSuite = ({
  address,
  appDir,
  firstSection,
  signedIn,
}: Options) => {
  const pages = appRoutes(appDir).map(({ groups, path }) => ({
    path: path.replace(LOCALE, "") || "/",
    signedIn: groups.includes(SIGNED_IN),
  }));

  test("finds the App's pages", CHROMIUM, () => {
    expect(pages.map(({ path }) => path)).toContain(AUTH.PAGE.SIGN_IN);
  });

  for (const { insets, name, size } of SCREENS) {
    for (const { path, signedIn: behindSignIn } of pages) {
      test(
        `${path} keeps clear of the notch ${name}`,
        CHROMIUM,
        async ({ page }) => {
          const addressOf = path.includes("[") ? address[path] : () => path;
          expect(addressOf, `no address for ${path} in address`).toBeDefined();
          await page.setViewportSize(viewport(size));
          await notch(page, insets);
          if (behindSignIn) {
            await signedIn(page);
          }
          await page.goto((await addressOf?.(page)) ?? path);
          await expectSafe(page, insets, behindSignIn);
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
      await signedIn(page);
      await page.goto(sectionHref(firstSection));
      await page.setViewportSize(viewport(SCREEN.VIEWPORT.PHONE_LANDSCAPE));
      await notch(page, SAFE_AREA.INSETS.SIDEWAYS);
      await expectSafe(page, SAFE_AREA.INSETS.SIDEWAYS, true);
    }
  );
};
