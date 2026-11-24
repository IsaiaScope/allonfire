import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import { LAURA, SECTION } from "../src/shared/constants/laura";
import { enT } from "../src/shared/tests/translators";
import { menuOf, openSidebar, signInAsAdmin } from "./pages";
import {
  cellOf,
  deletePhoto,
  favoriteAlts,
  gridOf,
  heartOf,
  markOf,
  otherUser,
  previewOf,
  tileAlts,
  tileOf,
  uploadPhoto,
} from "./photos";

const FIXTURE_FAVORITE = FIXTURE.IMAGE.IN_BOTH_APPS.alt.en;
const GALLERY_PATH = SECTION.GALLERY.path;
const FAVORITES_LABEL = enT(`Navigation.${SECTION.FAVORITES.label}`);
const FAVORITES_URL = new RegExp(`${LAURA.PAGE.FAVORITES}$`);

/** The server actions a page sends: each Favorite write is one. */
const countActions = (page: Page) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      sent.push(request.url());
    }
  });
  return sent;
};

/** Opens Favorites from the sidebar, with no reload. */
const openFavoritesByLink = async (page: Page) => {
  await openSidebar(page);
  await page.waitForLoadState("networkidle");
  await menuOf(page).getByRole("link", { name: FAVORITES_LABEL }).click();
  await expect(page).toHaveURL(FAVORITES_URL);
};

/** Clears a photo from the Favorites page with its heart: it leaves the list and the API's. */
const clearFromFavorites = async (page: Page, alt: string) => {
  await heartOf(cellOf(page, alt)).click();
  await expect(tileOf(page, alt)).toHaveCount(0);
  await expect.poll(() => favoriteAlts(page)).not.toContain(alt);
};

/** Only these photos of the Favorites grid, in the order it draws them. */
const orderOf = async (page: Page, alts: string[]) =>
  (await tileAlts(gridOf(page, "Favorites.list"))).filter((alt) =>
    alts.includes(alt)
  );

test("an Admin marks a photo, lists it with and without a reload, and clears it", async ({
  page,
}, { project }) => {
  await signInAsAdmin(page);
  const photo = await uploadPhoto(page, project.name);
  try {
    await page.goto(GALLERY_PATH);
    const heart = heartOf(cellOf(page, photo.alt));
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    const sent = countActions(page);
    // A burst of taps: marked, cleared, marked again. It ends marked, shows at once and is one write.
    await Promise.all([
      heart.dispatchEvent("click"),
      heart.dispatchEvent("click"),
      heart.dispatchEvent("click"),
    ]);
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => favoriteAlts(page)).toContain(photo.alt);
    expect(sent).toHaveLength(1);

    // Without a reload: the Favorites page opened by its link.
    await openFavoritesByLink(page);
    await expect(tileOf(page, photo.alt)).toBeVisible();
    // After a reload: read again.
    await page.reload();
    await expect(tileOf(page, photo.alt)).toBeVisible();

    // Clear it from the Favorites page: it leaves the list.
    await clearFromFavorites(page, photo.alt);
    await page.reload();
    await expect(tileOf(page, FIXTURE_FAVORITE)).toBeVisible();
    await expect(tileOf(page, photo.alt)).toHaveCount(0);
    // And the Gallery draws it unmarked.
    await page.goto(GALLERY_PATH);
    await expect(heartOf(cellOf(page, photo.alt))).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  } finally {
    await deletePhoto(page, photo.id);
  }
});

test("a User sees the Admin's mark after a reload, in the Admin's order, and not once it is cleared", async ({
  baseURL,
  browser,
  page,
  storageState,
}, { project }) => {
  await signInAsAdmin(page);
  const photo = await uploadPhoto(page, project.name);
  const user = await otherUser(browser, { baseURL, storageState });
  try {
    // The User has the photo before the mark.
    await user.page.goto(GALLERY_PATH);
    await expect(tileOf(user.page, photo.alt)).toBeVisible();
    await expect(markOf(cellOf(user.page, photo.alt))).toHaveCount(0);

    await page.goto(GALLERY_PATH);
    await heartOf(cellOf(page, photo.alt)).click();
    await expect.poll(() => favoriteAlts(page)).toContain(photo.alt);

    await user.page.reload();
    await expect(markOf(cellOf(user.page, photo.alt))).toBeVisible();
    await expect(user.page.locator("button[aria-pressed]")).toHaveCount(0);

    // The same order: the most recently marked first, the Fixture's after it.
    await page.goto(LAURA.PAGE.FAVORITES);
    await user.page.goto(LAURA.PAGE.FAVORITES);
    await expect(tileOf(page, photo.alt)).toBeVisible();
    await expect(tileOf(user.page, photo.alt)).toBeVisible();
    const expected = [photo.alt, FIXTURE_FAVORITE];
    expect(await orderOf(page, expected)).toEqual(expected);
    expect(await orderOf(user.page, expected)).toEqual(expected);

    // The Admin clears it: the User no longer sees it.
    await clearFromFavorites(page, photo.alt);
    await user.page.reload();
    await expect(tileOf(user.page, FIXTURE_FAVORITE)).toBeVisible();
    await expect(tileOf(user.page, photo.alt)).toHaveCount(0);
    await user.page.goto(GALLERY_PATH);
    await expect(tileOf(user.page, photo.alt)).toBeVisible();
    await expect(markOf(cellOf(user.page, photo.alt))).toHaveCount(0);
  } finally {
    await user.context.close();
    await deletePhoto(page, photo.id);
  }
});

test("an Admin removes a photo from the preview: it leaves the Gallery and the User's lists", async ({
  baseURL,
  browser,
  page,
  storageState,
}, { project }) => {
  await signInAsAdmin(page);
  const photo = await uploadPhoto(page, project.name);
  const user = await otherUser(browser, { baseURL, storageState });
  try {
    // A Favorite as well, to see it leave the User's Favorites too.
    await page.goto(GALLERY_PATH);
    await heartOf(cellOf(page, photo.alt)).click();
    await expect.poll(() => favoriteAlts(page)).toContain(photo.alt);
    await user.page.goto(LAURA.PAGE.FAVORITES);
    await expect(tileOf(user.page, photo.alt)).toBeVisible();

    await tileOf(page, photo.alt).click();
    const preview = previewOf(page);
    await expect(preview).toBeVisible();
    await preview
      .getByRole("button", { exact: true, name: enT("Gallery.remove.action") })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(enT("Gallery.remove.title"));
    await confirm
      .getByRole("button", { exact: true, name: enT("Gallery.remove.confirm") })
      .click();
    await expect(confirm).toHaveCount(0);
    // The preview moves to the next photo; closing it shows the grid without this one.
    await page.keyboard.press("Escape");
    await expect(previewOf(page)).toHaveCount(0);
    await expect(tileOf(page, photo.alt)).toHaveCount(0);
    await page.reload();
    await expect(gridOf(page, "Gallery.list")).toBeVisible();
    await expect(tileOf(page, photo.alt)).toHaveCount(0);

    await user.page.reload();
    await expect(tileOf(user.page, FIXTURE_FAVORITE)).toBeVisible();
    await expect(tileOf(user.page, photo.alt)).toHaveCount(0);
    await user.page.goto(GALLERY_PATH);
    await expect(gridOf(user.page, "Gallery.list")).toBeVisible();
    await expect(tileOf(user.page, photo.alt)).toHaveCount(0);
  } finally {
    await user.context.close();
    await deletePhoto(page, photo.id);
  }
});
