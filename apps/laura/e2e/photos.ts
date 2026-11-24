import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { galleryPageBodySchema } from "@allonfire/api/features/laura/constants/schemas";
import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE_FIXTURE } from "@allonfire/storage/features/image/fixtures/constants/files";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import { z } from "zod";
import { enT } from "../src/shared/tests/translators";
import { otherVisitor } from "./pages";

const PHOTO = resolve(IMAGE_FIXTURE.DIR, IMAGE_FIXTURE.FILE.PHOTO);
const API_URL = LOCAL.URL.API_E2E;

/** Every picture a spec uploads starts its alt with this, so the Fixture ones tell apart from a run's. */
export const E2E_ALT = "e2e photo";

let uploads = 0;

/**
 * Posts one Fixture picture into Laura as the Admin signed in on `page`, as
 * the Upload page will (`POST /v1/images`), under an alt unique to the run.
 * Answers the new Image's id and alt (English).
 */
export const uploadPhoto = async (page: Page, project: string) => {
  uploads += 1;
  const alt = `${E2E_ALT} ${project} ${Date.now()} ${uploads}`;
  const response = await page.request.post(`${API_URL}${API.PATH.IMAGES}`, {
    multipart: {
      file: {
        buffer: await readFile(PHOTO),
        mimeType: "image/jpeg",
        name: IMAGE_FIXTURE.FILE.PHOTO,
      },
      meta: stringifyJson([
        { alt: { en: alt, it: `${alt} it` }, apps: [App.LAURA] },
      ]),
    },
  });
  expect(response.status()).toBe(HTTP.STATUS.CREATED);
  const [image] = z
    .array(z.object({ id: z.string() }))
    .parse(await response.json());
  return { alt, id: image?.id ?? "" };
};

/** Deletes an uploaded Image everywhere; one already gone is no error. */
export const deletePhoto = async (page: Page, id: string) => {
  const response = await page.request.delete(`${API_URL}${API.PATH.IMAGES}`, {
    data: { ids: [id] },
  });
  expect(response.status()).toBe(HTTP.STATUS.OK);
};

/** The address of one Favorite's write. */
export const favoriteUrl = (id: string) =>
  `${API_URL}${API.PATH.LAURA.FAVORITES}/${id}`;

/** The caller's Favorites, read from the API with the session of `page`: the alts (English) in order. */
export const favoriteAlts = async (page: Page) => {
  const response = await page.request.get(
    `${API_URL}${API.PATH.LAURA.FAVORITES}`
  );
  expect(response.status()).toBe(HTTP.STATUS.OK);
  const { items } = galleryPageBodySchema.parse(await response.json());
  return items.map(({ alt }) => alt.en);
};

/** The id of the Gallery photo with this alt (English), read as the caller. */
export const photoIdOf = async (page: Page, alt: string) => {
  const response = await page.request.get(
    `${API_URL}${API.PATH.LAURA.GALLERY}`
  );
  const { items } = galleryPageBodySchema.parse(await response.json());
  return items.find((item) => item.alt.en === alt)?.id ?? "";
};

/** The Gallery's or Favorites' grid. */
export const gridOf = (page: Page, list: "Favorites.list" | "Gallery.list") =>
  page.getByRole("list", { name: enT(list) });

/** The photo's button in the grid, named by its alt. */
export const tileOf = (page: Page, alt: string) =>
  page.getByRole("button", { exact: true, name: alt });

/** The grid cell holding a photo: its button and its heart or mark. */
export const cellOf = (page: Page, alt: string) =>
  page.getByRole("listitem").filter({ has: tileOf(page, alt) });

/** The Admin's heart in `scope`: named for what it does next, so found by what it is. */
export const heartOf = (scope: Page | Locator) =>
  scope.locator("button[aria-pressed]");

/** A User's static mark in `scope`. */
export const markOf = (scope: Page | Locator) =>
  scope.getByRole("img", { exact: true, name: enT("Gallery.favorite.is") });

/** The alts of the photos a grid draws, in order. */
export const tileAlts = (grid: Locator) =>
  grid
    .locator("li > button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? "")
    );

/** The preview. */
export const previewOf = (page: Page) =>
  page.getByRole("dialog").filter({ visible: true });

/**
 * Another visitor: a second browser context with the first one's address and
 * storage (the install hint dismissed), signed in as a Laura User.
 */
export const otherUser = (
  browser: Browser,
  options: Parameters<typeof otherVisitor>[1]
) => otherVisitor(browser, options, FIXTURE.USER.LAURA.USER);
