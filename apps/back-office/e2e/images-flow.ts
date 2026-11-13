import { resolve } from "node:path";
import { IMAGE_FIXTURE } from "@allonfire/storage/features/image/fixtures/constants/files";
import {
  type Browser,
  type BrowserContextOptions,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { newImageHref } from "../src/features/images/utils/image-href";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { enT } from "../src/shared/tests/translators";
import { signInAsAdmin } from "./pages";

/** The Images words every Images spec reads. */
export const t = EN.Images;

export const PHOTO = resolve(IMAGE_FIXTURE.DIR, IMAGE_FIXTURE.FILE.PHOTO);

/** A picture's alt, unique to the run, so its row is found among the others. */
export const altOf = (project: string, label = "sea") =>
  `e2e ${label} ${project} ${Date.now()}`;

export const addForm = (page: Page) =>
  page.getByRole("form", { name: t.add.title });
export const editForm = (page: Page) =>
  page.getByRole("form", { name: t.edit.title });

/** The Add page's picture row `number`. */
export const rowOf = (page: Page, number: number) =>
  addForm(page).getByRole("group", {
    name: enT("Images.add.row.title", { number }),
  });

/** WebKit capitalises a language's own name ("Italiano"), Chrome does not. */
export const altField = (scope: Locator, language: string) =>
  scope.getByLabel(new RegExp(`^${language}$`, "i"));

/** The Image's link in the list, by its alt. */
export const imageLink = (page: Page, alt: string) =>
  page.getByRole("link", { exact: true, name: alt });

/** The list's search once it is in the address. */
const SEARCH_IN_ADDRESS = /search=/;

/** Narrows the list to the Images whose alt or file name holds `text`. */
export const searchFor = async (page: Page, text: string) => {
  // Typed before the list has hydrated, the text never reaches the address: type again until it does.
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.getByRole("searchbox", { name: t.search.label }).fill(text);
    await expect(page).toHaveURL(SEARCH_IN_ADDRESS, { timeout: 2000 });
  }).toPass();
  // Then the list is read again: a click while it redraws is lost.
  await page.waitForLoadState("networkidle");
  await expect(imageLink(page, text).first()).toBeVisible();
};

/** Opens the Add page once it can take a file: one set before hydration is lost. */
export const openAdd = async (page: Page) => {
  await page.goto(newImageHref());
  await page.waitForLoadState("networkidle");
};

export type PickedFile = { buffer: Buffer; mimeType: string; name: string };

/** Picks `files` (paths or in-memory files) with the Add page's picker. */
export const pick = (page: Page, files: string | string[] | PickedFile[]) =>
  page.getByLabel(t.add.pick.input).setInputFiles(files);

/** Gives row `number` its alt in English and Italian. */
export const fillRow = async (page: Page, number: number, alt: string) => {
  const row = rowOf(page, number);
  await altField(row, "English").fill(alt);
  await altField(row, "italiano").fill(`${alt} it`);
};

export const submitAdd = (page: Page) =>
  page.getByRole("button", { name: t.add.submit }).click();

/** Adds the sample photo as a private Back Office Image, and waits for the list. */
export const addPhoto = async (page: Page, alt: string) => {
  await openAdd(page);
  await pick(page, PHOTO);
  await fillRow(page, 1, alt);
  await submitAdd(page);
  await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  await expect(imageLink(page, alt).first()).toBeVisible();
};

/** Opens the Image the list shows under `alt`. */
export const openFromList = async (page: Page, alt: string) => {
  await imageLink(page, alt).first().click();
  await expect(editForm(page)).toBeVisible();
};

/** Deletes the Image whose Edit page is open, and waits for the list. */
export const deleteOpened = async (page: Page) => {
  await page.getByRole("button", { name: t.delete.action }).click();
  await page.getByRole("button", { name: t.delete.confirm }).click();
  await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
};

/** Opens the Image the list shows under `alt`, and deletes it. */
export const deleteFromList = async (page: Page, alt: string) => {
  await openFromList(page, alt);
  await deleteOpened(page);
};

/** The id in an Image's address, read from its link in the list. */
export const idOf = async (page: Page, alt: string) => {
  const href = await imageLink(page, alt).first().getAttribute("href");
  return href?.split("/").at(-1) ?? "";
};

/**
 * Another Admin: a second browser context signed in as the Back Office
 * Admin, with the first one's address and storage (the install hint
 * dismissed), so the two see the same data but keep their own caches.
 */
export const otherAdmin = async (
  browser: Browser,
  options: {
    baseURL: string | undefined;
    storageState: BrowserContextOptions["storageState"] | undefined;
  }
) => {
  const { baseURL, storageState } = options;
  // Playwright's own types refuse an explicit `undefined`: pass only what is set.
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    ...(storageState ? { storageState } : {}),
  });
  const page = await context.newPage();
  await signInAsAdmin(page);
  return { context, page };
};
