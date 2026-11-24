import { HTTP } from "@allonfire/core/features/http/constants/http";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, test } from "@playwright/test";
import { LAURA, SECTION } from "../src/shared/constants/laura";
import { enT } from "../src/shared/tests/translators";
import { signInAsUser } from "./pages";
import {
  cellOf,
  E2E_ALT,
  favoriteAlts,
  favoriteUrl,
  gridOf,
  heartOf,
  markOf,
  photoIdOf,
  previewOf,
  tileAlts,
  tileOf,
} from "./photos";

const FAVORITE = FIXTURE.IMAGE.IN_BOTH_APPS.alt.en;
const PLAIN = FIXTURE.IMAGE.PRIVATE_IN_LAURA.alt.en;
const BACK_OFFICE_ONLY = FIXTURE.IMAGE.PRIVATE_IN_BACK_OFFICE.alt.en;

/** A run's own uploads come and go beside these tests: only the Fixture's are compared. */
const fixtureOnly = (alts: string[]) =>
  alts.filter((alt) => !alt.startsWith(E2E_ALT));

test.beforeEach(async ({ page }) => {
  await signInAsUser(page);
});

test("a User sees Laura's photos as tiles, the Favorite marked and no heart to press", async ({
  page,
}) => {
  await page.goto(SECTION.GALLERY.path);
  await expect(gridOf(page, "Gallery.list")).toBeVisible();
  await expect(tileOf(page, FAVORITE)).toBeVisible();
  await expect(tileOf(page, PLAIN)).toBeVisible();
  // Another App's photo is no Laura photo.
  await expect(tileOf(page, BACK_OFFICE_ONLY)).toHaveCount(0);
  await expect(markOf(cellOf(page, FAVORITE))).toBeVisible();
  await expect(markOf(cellOf(page, PLAIN))).toHaveCount(0);
  await expect(page.locator("button[aria-pressed]")).toHaveCount(0);
});

test("a User's Favorites list is the Fixture Favorite", async ({ page }) => {
  await page.goto(LAURA.PAGE.FAVORITES);
  await expect(tileOf(page, FAVORITE)).toBeVisible();
  await expect(tileOf(page, PLAIN)).toHaveCount(0);
  expect(fixtureOnly(await tileAlts(gridOf(page, "Favorites.list")))).toEqual([
    FAVORITE,
  ]);
});

test("a User's preview shows the mark and never Remove", async ({ page }) => {
  await page.goto(SECTION.GALLERY.path);
  await tileOf(page, FAVORITE).click();
  const preview = previewOf(page);
  await expect(preview).toBeVisible();
  await expect(preview.getByText(FAVORITE, { exact: true })).toBeVisible();
  await expect(markOf(preview)).toBeVisible();
  await expect(heartOf(preview)).toHaveCount(0);
  await expect(
    preview.getByRole("button", {
      exact: true,
      name: enT("Gallery.remove.action"),
    })
  ).toHaveCount(0);
  await expect(
    preview.getByRole("button", { name: enT("Gallery.preview.close") })
  ).toBeVisible();
});

test("a User calling the writes is refused and the Favorites stay as they were", async ({
  page,
}) => {
  await page.goto(SECTION.GALLERY.path);
  const plainId = await photoIdOf(page, PLAIN);
  const favoriteId = await photoIdOf(page, FAVORITE);
  expect(plainId).not.toBe("");
  expect(favoriteId).not.toBe("");
  const mark = await page.request.put(favoriteUrl(plainId));
  expect(mark.status()).toBe(HTTP.STATUS.FORBIDDEN);
  const clear = await page.request.delete(favoriteUrl(favoriteId));
  expect(clear.status()).toBe(HTTP.STATUS.FORBIDDEN);
  expect(fixtureOnly(await favoriteAlts(page))).toEqual([FAVORITE]);
});
