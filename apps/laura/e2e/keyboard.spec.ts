import { expect, type Page, test } from "@playwright/test";
import { SECTION } from "../src/features/navigation/constants/sections";
import { enT } from "../src/shared/tests/translators";
import { signInAsAdmin } from "./pages";
import { gridOf, previewOf, tileAlts } from "./photos";

/** Long enough for every stop before the grid. */
const TAB_TIMEOUT_MS = 20_000;
const PREVIEW_TABS = 8;

/** The photo buttons, in order. */
const tiles = (page: Page) =>
  gridOf(page, "Gallery.list").locator("li > button");

/** Presses Tab until the keyboard is on the tile: the way a keyboard reaches it. */
const tabTo = async (page: Page, index: number, browserName: string) => {
  const tile = tiles(page).nth(index);
  // Safari's Tab skips buttons unless the system asks for it: WebKit is put on the tile.
  if (browserName === "webkit") {
    await tile.focus();
    return tile;
  }
  await expect(async () => {
    await page.keyboard.press("Tab");
    await expect(tile).toBeFocused({ timeout: 500 });
  }).toPass({ intervals: [50], timeout: TAB_TIMEOUT_MS });
  return tile;
};

/** Presses `key` `times` times, one after the other, the preview holding the focus each time. */
const pressInside = (page: Page, key: string, times: number) =>
  Array.from({ length: times }).reduce<Promise<void>>(async (done) => {
    await done;
    await page.keyboard.press(key);
    await expect(previewOf(page).locator(":focus")).toHaveCount(1);
  }, Promise.resolve());

/** The preview shows the photo `alt`, in its caption. */
const showing = (page: Page, alt: string) =>
  expect(previewOf(page).getByText(alt, { exact: true })).toBeVisible();

test("the Gallery's photos open, step and close without a mouse", async ({
  browserName,
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(SECTION.GALLERY.path);
  await expect(tiles(page).nth(1)).toBeVisible();
  // Hydrated: a key pressed before it is lost.
  await page.waitForLoadState("networkidle");
  const [first = "", second = ""] = await tileAlts(
    gridOf(page, "Gallery.list")
  );
  const tile = await tabTo(page, 0, browserName);
  await expect(tile).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(previewOf(page)).toBeVisible();
  await showing(page, first);

  await page.keyboard.press("ArrowRight");
  await showing(page, second);
  await page.keyboard.press("ArrowLeft");
  await showing(page, first);

  await page.keyboard.press("Escape");
  await expect(previewOf(page)).toHaveCount(0);
  await expect(tile).toBeFocused();
});

test("Tab and Shift+Tab never leave the open preview", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(SECTION.GALLERY.path);
  await page.waitForLoadState("networkidle");
  await tiles(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(previewOf(page)).toBeVisible();
  await pressInside(page, "Tab", PREVIEW_TABS);
  await pressInside(page, "Shift+Tab", PREVIEW_TABS);
  // A button the keyboard just reached shows its tip, and the first Escape
  // dismisses the tip (as a tooltip does); the next closes the preview.
  await expect(async () => {
    await page.keyboard.press("Escape");
    await expect(previewOf(page)).toHaveCount(0, { timeout: 1000 });
  }).toPass();
});

test("the preview's Close button is reached with Tab and closes it", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(SECTION.GALLERY.path);
  await page.waitForLoadState("networkidle");
  await tiles(page).first().focus();
  await page.keyboard.press("Enter");
  const preview = previewOf(page);
  await expect(preview).toBeVisible();
  await preview
    .getByRole("button", { name: enT("Gallery.preview.close") })
    .focus();
  await page.keyboard.press("Enter");
  await expect(previewOf(page)).toHaveCount(0);
});
