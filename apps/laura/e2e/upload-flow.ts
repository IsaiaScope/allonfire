import { resolve } from "node:path";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { IMAGE_FIXTURE } from "@allonfire/storage/features/image/fixtures/constants/files";
import { expect, type Locator, type Page } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { SECTION } from "../src/features/navigation/constants/sections";
import { enT } from "../src/shared/tests/translators";

/** The Upload words every Upload spec reads. */
export const t = EN.Upload;
/** The words every App's Image forms share (core's `Common`). */
export const upload = SHARED_TRANSLATIONS.en.Common.ImageUpload;

export const PHOTO = resolve(IMAGE_FIXTURE.DIR, IMAGE_FIXTURE.FILE.PHOTO);
export const HEIC = resolve(IMAGE_FIXTURE.DIR, IMAGE_FIXTURE.FILE.HEIC);

/** A picture's alt, unique to the run, so its tile is found among the others. */
export const altOf = (project: string, label = "sea") =>
  `e2e upload ${label} ${project} ${Date.now()}`;

export const uploadForm = (page: Page) =>
  page.getByRole("form", { name: t.title });

/** The form's picture row `number`. */
export const rowOf = (page: Page, number: number) =>
  uploadForm(page).getByRole("group", {
    name: enT("Common.ImageUpload.row.title", { number }),
  });

/** WebKit capitalises a language's own name ("Italiano"), Chrome does not. */
export const altField = (scope: Locator, language: string) =>
  scope.getByLabel(new RegExp(`^${language}$`, "i"));

/** The drop area: a region named like the file input behind it. */
export const dropzoneOf = (page: Page) =>
  page.getByRole("region", { name: upload.pick.input });

/** Opens the Upload page once it can take a file: one set before hydration is lost. */
export const openUpload = async (page: Page) => {
  await page.goto(SECTION.UPLOAD.path);
  await page.waitForLoadState("networkidle");
  await expect(dropzoneOf(page)).toBeVisible();
};

export type PickedFile = { buffer: Buffer; mimeType: string; name: string };

/** Picks `files` (paths or in-memory files) with the drop area's input. */
export const pick = (page: Page, files: string | string[] | PickedFile[]) =>
  page.getByRole("button", { name: upload.pick.input }).setInputFiles(files);

// jscpd:ignore-start
// The Back Office's e2e twin: the same steps over its own page's locators.
/** Gives row `number` its alt in English and Italian. */
export const fillRow = async (page: Page, number: number, alt: string) => {
  const row = rowOf(page, number);
  await altField(row, "English").fill(alt);
  await altField(row, "italiano").fill(`${alt} it`);
};

export const submitUpload = (page: Page) =>
  page.getByRole("button", { name: t.submit }).click();
// jscpd:ignore-end
