import { readFile } from "node:fs/promises";
import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { imagePageBodySchema } from "@allonfire/storage/features/image/hono/constants/schemas";
import { expect, type Page, test } from "@playwright/test";
import { SECTION } from "../src/features/navigation/constants/sections";
import { LAURA_BASE } from "../src/shared/constants/laura-base";
import { enT } from "../src/shared/tests/translators";
import { signInAsAdmin, tapSidebarLink } from "./pages";
import { deletePhoto, photoIdOf, tileOf } from "./photos";
import {
  altField,
  altOf,
  dropzoneOf,
  fillRow,
  HEIC,
  openUpload,
  PHOTO,
  pick,
  rowOf,
  submitUpload,
  t,
  upload,
  uploadForm,
} from "./upload-flow";

const API_URL = LOCAL.URL.API_E2E;
/** The Images listed for Laura, newest first. */
const LAURA_IMAGES = `${API_URL}${API.PATH.IMAGES}?app=${App.LAURA}`;
/** Two of these together pass the 10 MB a proxy buffers by default. */
const BIG_BATCH_FILE_BYTES = 6 * 1024 * 1024;
/** A row's Remove button: named by its file. */
const REMOVE_ROW = new RegExp(`^${upload.row.remove.replace("{name}", ".*")}$`);
/** Home, the Gallery: the site's root or a locale's (`SECTION.GALLERY.path` is empty, which would match any URL). */
const GALLERY_URL = new RegExp(`${LAURA_BASE.PAGE.GALLERY}$|/(en|it)$`);

/** The Images the API lists for Laura to `page`'s session, by English alt. */
const laura = async (page: Pick<Page, "request">) => {
  const response = await page.request.get(LAURA_IMAGES);
  expect(response.status()).toBe(HTTP.STATUS.OK);
  return imagePageBodySchema.parse(await response.json()).images;
};

/** Removes what a spec added, as the Admin signed in on `page`. */
const cleanUp = (page: Page, alts: string[]) =>
  Promise.all(
    alts.map(async (alt) => deletePhoto(page, await photoIdOf(page, alt)))
  );

/**
 * Opens the file chooser with `key` on the focused drop area and picks the
 * photo. A key pressed before the page has hydrated is lost: press again
 * until the chooser opens.
 */
const chooseWith = (page: Page, key: string) =>
  expect(async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 1500 });
    await page.keyboard.press(key);
    await (await chooser).setFiles(PHOTO);
  }).toPass();

/** Removes picture row `number` with Enter on its Remove button. */
const removeByKeyboard = async (page: Page, number: number) => {
  await rowOf(page, number).getByRole("button", { name: REMOVE_ROW }).focus();
  await page.keyboard.press("Enter");
};

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

/**
 * (a1) The Gallery was opened first and the Admin moves to Upload by a soft
 * navigation: the feed is still in the browser, so it must be read again.
 * (a2) Upload opened directly: no feed in the browser, so the Gallery
 * hydrates a fresh first page.
 */
for (const via of ["soft navigation", "direct visit"] as const) {
  test(`an Admin uploads a private photo and the Gallery shows it (${via})`, async ({
    page,
    request,
  }, { project }) => {
    const alt = altOf(project.name, via === "direct visit" ? "direct" : "soft");
    if (via === "soft navigation") {
      await page.goto(SECTION.GALLERY.path);
      await page.waitForLoadState("networkidle");
      await tapSidebarLink(page, enT(`Navigation.${SECTION.UPLOAD.label}`));
      await expect(dropzoneOf(page)).toBeVisible();
      await page.waitForLoadState("networkidle");
    } else {
      await openUpload(page);
    }
    await pick(page, PHOTO);
    await fillRow(page, 1, alt);
    await submitUpload(page);
    await expect(page).toHaveURL(GALLERY_URL);
    await expect(
      page.getByText(enT("Upload.added", { count: 1 }))
    ).toBeVisible();
    await expect(tileOf(page, alt)).toBeVisible();
    // Private: the Admin lists it for Laura, a signed-out visitor does not.
    expect((await laura(page)).map(({ alt: names }) => names.en)).toContain(
      alt
    );
    // Whatever the API answers a visitor who is not signed in, it never names the image.
    expect(await (await request.get(LAURA_IMAGES)).text()).not.toContain(alt);
    await cleanUp(page, [alt]);
  });
}

test("an iPhone picture is previewed and stored as it is", async ({ page }, {
  project,
}) => {
  const alt = altOf(project.name, "heic");
  await openUpload(page);
  await pick(page, HEIC);
  // A picture shows in the row, not the fallback the browser draws for what it cannot decode.
  await expect(rowOf(page, 1).locator("img").first()).toBeVisible();
  await expect(rowOf(page, 1).getByTestId("preview-fallback")).toHaveCount(0);
  await fillRow(page, 1, alt);
  await submitUpload(page);
  await expect(page).toHaveURL(GALLERY_URL);
  await expect(tileOf(page, alt)).toBeVisible();
  await cleanUp(page, [alt]);
});

test("a refused batch keeps the row and what was typed, and adds nothing", async ({
  page,
}, { project }) => {
  const alt = altOf(project.name, "refused");
  await openUpload(page);
  await pick(page, [
    {
      buffer: Buffer.from("not a picture"),
      mimeType: "image/jpeg",
      name: "text.jpg",
    },
  ]);
  await fillRow(page, 1, alt);
  await submitUpload(page);
  await expect(page.getByText(upload.error.unsupported)).toBeVisible();
  await expect(rowOf(page, 1)).toBeVisible();
  await expect(altField(rowOf(page, 1), "English")).toHaveValue(alt);
  await expect(page).toHaveURL(new RegExp(`${SECTION.UPLOAD.path}$`));
  expect((await laura(page)).map(({ alt: names }) => names.en)).not.toContain(
    alt
  );
});

test("two pictures larger together than a proxy buffers by default arrive whole", async ({
  page,
}, { project }) => {
  const alts = [1, 2].map(
    (number) => `${altOf(project.name, "big")} ${number}`
  );
  const photo = await readFile(PHOTO);
  const padded = Buffer.concat([
    photo,
    Buffer.alloc(BIG_BATCH_FILE_BYTES - photo.length),
  ]);
  // jscpd:ignore-start
  // The Back Office's e2e twin: the same steps over its own page's locators.
  await openUpload(page);
  await pick(
    page,
    alts.map((_, index) => ({
      buffer: padded,
      mimeType: "image/jpeg",
      name: `big-${index}.jpg`,
    }))
  );
  await fillRow(page, 1, alts[0] ?? "");
  await fillRow(page, 2, alts[1] ?? "");
  await submitUpload(page);
  // jscpd:ignore-end
  await expect(page).toHaveURL(GALLERY_URL);
  await expect(tileOf(page, alts[0] ?? "")).toBeVisible();
  await expect(tileOf(page, alts[1] ?? "")).toBeVisible();
  await cleanUp(page, alts);
});

test("without a mouse: the drop area opens the chooser, then Choose, the row's fields and Remove", async ({
  page,
}) => {
  await openUpload(page);
  const area = dropzoneOf(page);
  await area.focus();
  await expect(area).toBeFocused();
  await chooseWith(page, "Enter");
  await chooseWith(page, "Space");
  await expect(rowOf(page, 2)).toBeVisible();
  // Tab from the drop area reaches its Choose button.
  await area.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: upload.dropzone.choose })
  ).toBeFocused();
  // Further Tabs reach row 1's own fields.
  const english = altField(rowOf(page, 1), "English");
  await expect(async () => {
    await page.keyboard.press("Tab");
    await expect(english).toBeFocused({ timeout: 500 });
  }).toPass();
  // Removing the last row by keyboard returns focus to the heading.
  await removeByKeyboard(page, 2);
  await removeByKeyboard(page, 1);
  await expect(uploadForm(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: t.title })
  ).toBeFocused();
});

test("a file dropped on the drop area makes a row", async ({ page }) => {
  await openUpload(page);
  const area = dropzoneOf(page);
  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["x"], "dropped.jpg", { type: "image/jpeg" }));
    return transfer;
  });
  await area.dispatchEvent("dragenter", { dataTransfer: data });
  await area.dispatchEvent("dragover", { dataTransfer: data });
  await area.dispatchEvent("drop", { dataTransfer: data });
  await expect(rowOf(page, 1)).toBeVisible();
});
