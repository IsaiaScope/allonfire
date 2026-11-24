import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { instant } from "@next/playwright";
import { expect, type Page, test } from "@playwright/test";
import { LAURA, SECTION } from "../src/shared/constants/laura";
import { enT } from "../src/shared/tests/translators";
import { signInAsUser, tapSidebarLink } from "./pages";
import { gridOf, tileOf } from "./photos";

// What a link prefetches is ready the moment it is clicked: inside `instant()`
// a navigation shows only what was prefetched, and the rest waits for the
// callback to end (ADR 0028). A Gallery page's first photos are in that
// prefetch (the private cache); a visit that arrives without one (a first
// load) shows the static shell and the skeleton. Runs against the production
// build, the only one that prefetches.

const GALLERY_LABEL = enT(`Navigation.${SECTION.GALLERY.label}`);
const FAVORITES_LABEL = enT(`Navigation.${SECTION.FAVORITES.label}`);
const HOME_URL = /\/$/;
const SHOWN = FIXTURE.IMAGE.IN_BOTH_APPS.alt.en;

/** The skeleton of the first page, announced once (Favorites draws the Gallery's). */
const loading = (page: Page) =>
  page.getByRole("status").filter({ hasText: enT("Gallery.loading") });

const heading = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name });

test("a first visit to the Gallery commits its frame and title, and the skeleton fills the page while the photos read", async ({
  page,
}) => {
  await signInAsUser(page);
  await instant(
    page,
    async () => {
      await page.goto(SECTION.GALLERY.path);
      await expect(
        page.getByRole("button", {
          name: SHARED_TRANSLATIONS.en.Common.Navigation.toggleMenu,
        })
      ).toBeVisible();
      await expect(heading(page, GALLERY_LABEL)).toBeAttached();
      await expect(loading(page)).toBeVisible();
      await expect(gridOf(page, "Gallery.list")).toHaveCount(0);
    },
    { baseURL: LOCAL.URL.LAURA_E2E }
  );
  // WebKit keeps the held document from streaming in once released: the visit is made again.
  await page.goto(SECTION.GALLERY.path);
  await expect(gridOf(page, "Gallery.list")).toBeVisible();
  await expect(loading(page)).toHaveCount(0);
});

test("a first visit to Favorites commits its frame and title, and the skeleton fills the page while the photos read", async ({
  page,
}) => {
  await signInAsUser(page);
  await instant(
    page,
    async () => {
      await page.goto(LAURA.PAGE.FAVORITES);
      await expect(heading(page, FAVORITES_LABEL)).toBeAttached();
      await expect(loading(page)).toBeVisible();
      await expect(gridOf(page, "Favorites.list")).toHaveCount(0);
    },
    { baseURL: LOCAL.URL.LAURA_E2E }
  );
  await page.goto(LAURA.PAGE.FAVORITES);
  await expect(gridOf(page, "Favorites.list")).toBeVisible();
});

test("the sidebar's Favorites link opens the list with its photos already there", async ({
  page,
}) => {
  await signInAsUser(page);
  await page.goto(SECTION.GALLERY.path);
  await instant(page, async () => {
    await tapSidebarLink(page, FAVORITES_LABEL);
    await expect(page).toHaveURL(new RegExp(`${LAURA.PAGE.FAVORITES}$`));
    await expect(heading(page, FAVORITES_LABEL)).toBeVisible();
    await expect(tileOf(page, SHOWN)).toBeVisible();
    await expect(loading(page)).toHaveCount(0);
  });
});

test("the sidebar's Gallery link opens the photos already there", async ({
  page,
}) => {
  await signInAsUser(page);
  await page.goto(LAURA.PAGE.FAVORITES);
  await instant(page, async () => {
    await tapSidebarLink(page, GALLERY_LABEL);
    await expect(page).toHaveURL(HOME_URL);
    await expect(heading(page, GALLERY_LABEL)).toBeVisible();
    await expect(tileOf(page, SHOWN)).toBeVisible();
    await expect(loading(page)).toHaveCount(0);
  });
});
