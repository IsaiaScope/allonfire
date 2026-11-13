import { readFile } from "node:fs/promises";
import { App } from "@allonfire/database/enums";
import { expect, test } from "@playwright/test";
import { newImageHref } from "../src/features/images/utils/image-href";
import { APP_ENTRY } from "../src/shared/constants/apps";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import {
  altField,
  altOf,
  deleteFromList,
  deleteOpened,
  editForm,
  fillRow,
  imageLink,
  openAdd,
  openFromList,
  PHOTO,
  pick,
  rowOf,
  submitAdd,
  t,
} from "./images-flow";
import { signInAsAdmin } from "./pages";

test("an Admin adds a picture with alt in three languages, edits it, and deletes it", async ({
  page,
}, { project }) => {
  const alt = altOf(project.name);
  await signInAsAdmin(page);
  await openAdd(page);
  await pick(page, PHOTO);
  const row = rowOf(page, 1);
  await fillRow(page, 1, alt);
  await row.getByRole("combobox", { name: t.form.addLanguage }).fill("French");
  await page.getByRole("option", { name: "French" }).click();
  await altField(row, "français").fill(`${alt} fr`);
  await submitAdd(page);
  await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);

  // The new Image is first in the list: open it.
  await openFromList(page, alt);
  await expect(altField(editForm(page), "français")).toHaveValue(`${alt} fr`);
  await altField(editForm(page), "français").fill(`${alt} fr edited`);
  await page.getByRole("button", { name: t.edit.submit }).click();
  await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);

  await openFromList(page, alt);
  await expect(altField(editForm(page), "français")).toHaveValue(
    `${alt} fr edited`
  );
  await deleteOpened(page);
  await expect(imageLink(page, alt)).toHaveCount(0);
});

test("the Add page starts the shared set on an App the Admin administers", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newImageHref());
  await expect(
    page
      .getByRole("group", { name: t.add.shared.title })
      .getByRole("radiogroup", { name: APP_ENTRY[App.BACK_OFFICE].name })
      .getByRole("button", { exact: true, name: t.form.appIn })
  ).toHaveAttribute("aria-current", "page");
});

/** Next's proxy buffers a request body up to 10 MB by default: a bigger batch must still arrive whole. */
const BIG_BATCH_FILE_BYTES = 6 * 1024 * 1024;

test("an Admin adds pictures together larger than a proxy buffers by default, and deletes them", async ({
  page,
}, { project }) => {
  const alts = [1, 2].map((number) => `${altOf(project.name)} ${number}`);
  const photo = await readFile(PHOTO);
  const padded = Buffer.concat([
    photo,
    Buffer.alloc(BIG_BATCH_FILE_BYTES - photo.length),
  ]);
  await signInAsAdmin(page);
  await openAdd(page);
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
  await submitAdd(page);
  await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  await deleteFromList(page, alts[0] ?? "");
  await deleteFromList(page, alts[1] ?? "");
});
