import { readFile, writeFile } from "node:fs/promises";
import { E2E } from "@allonfire/config/tests/e2e/run";
import { App } from "@allonfire/database/enums";
import { MAX_ALT_LENGTH } from "@allonfire/database/features/image/utils/alt";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { expect, type Page, test } from "@playwright/test";
import { IMAGES } from "../src/features/images/constants/images";
import { imageHref } from "../src/features/images/utils/image-href";
import { APP_ENTRY } from "../src/shared/constants/apps";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { enT } from "../src/shared/tests/translators";
import {
  addForm,
  addPhoto,
  altField,
  altOf,
  deleteFromList,
  deleteOpened,
  editForm,
  fillRow,
  idOf,
  imageLink,
  openAdd,
  openFromList,
  otherAdmin,
  PHOTO,
  pick,
  rowOf,
  searchFor,
  submitAdd,
  t,
} from "./images-flow";
import { SIGN_IN_URL, signInAsAdmin } from "./pages";

const BACK_OFFICE_NAME = APP_ENTRY[App.BACK_OFFICE].name;
/** A file a browser would send as a picture but that no decoder reads. */
const NOT_A_PICTURE = {
  buffer: Buffer.from("this is not a picture, whatever its name says"),
  mimeType: "image/jpeg",
  name: "broken.jpg",
};
/** A text file the picker lets through: the API is the judge of what a picture is. */
const TEXT_FILE = {
  buffer: Buffer.from("notes"),
  mimeType: "text/plain",
  name: "notes.txt",
};
const tiny = (name: string) => ({
  buffer: Buffer.from("x"),
  mimeType: "image/jpeg",
  name,
});

/** The row's App toggle for the Back Office, on its `state` ("In" or "Not in"). */
const backOfficeToggle = (
  row: ReturnType<typeof rowOf>,
  state: typeof t.form.appIn | typeof t.form.appOut
) =>
  row
    .getByRole("radiogroup", { name: BACK_OFFICE_NAME })
    .getByRole("button", { exact: true, name: state });

/** How long one submit has to bring the API's refusal before it is tried again. */
const REFUSAL_WAIT_MS = 5000;

/** Picks a good picture and a broken one on the Add page, each given its alt. */
const pickGoodAndBroken = async (page: Page, alts: string[]) => {
  await pick(page, [
    { buffer: await readFile(PHOTO), mimeType: "image/jpeg", name: "ok.jpg" },
    NOT_A_PICTURE,
  ]);
  await fillRow(page, 1, alts[0] ?? "");
  await fillRow(page, 2, alts[1] ?? "");
};

/** Ticks the list's selection box of the Image shown under `alt`. */
const selectInList = (page: Page, alt: string) =>
  page
    .getByRole("checkbox", { name: enT("Images.delete.select", { alt }) })
    .filter({ visible: true })
    .check();

test.describe("Add: what the picker leaves out", () => {
  test("more pictures than one upload takes: the first ones stay and a toast says why", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await openAdd(page);
    await pick(
      page,
      Array.from({ length: IMAGE.LIMIT.FILES_PER_UPLOAD + 1 }, (_, index) =>
        tiny(`many-${index}.jpg`)
      )
    );
    await expect(page.getByText(t.form.field.tooManyFiles)).toBeVisible();
    await expect(rowOf(page, IMAGE.LIMIT.FILES_PER_UPLOAD)).toBeVisible();
    await expect(rowOf(page, IMAGE.LIMIT.FILES_PER_UPLOAD + 1)).toHaveCount(0);
  });

  test("a picture over the size limit is left out with a toast, the others stay", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await openAdd(page);
    await pick(page, [
      {
        buffer: Buffer.alloc(IMAGE.LIMIT.FILE_BYTES + 1),
        mimeType: "image/jpeg",
        name: "huge.jpg",
      },
      tiny("small.jpg"),
    ]);
    await expect(page.getByText(t.form.field.fileTooLarge)).toBeVisible();
    await expect(
      rowOf(page, 1).getByText("small.jpg", { exact: true })
    ).toBeVisible();
    await expect(rowOf(page, 2)).toHaveCount(0);
  });

  test("Cancel leaves the form for the list and adds nothing", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await openAdd(page);
    await pick(page, PHOTO);
    await page.getByRole("link", { name: t.form.cancel }).click();
    await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  });
});

/** Past the upload's limit with six pictures, each within the file limit; five fit. */
const PART_BYTES = Math.ceil(IMAGE.LIMIT.UPLOAD_BYTES / 6) + 1;

test.describe("Add: the whole upload's size", () => {
  // Six parts of about 17 MiB cross the protocol to the browser: Chromium only.
  test(
    "pictures that together pass the upload's limit: the last one is left out with a toast",
    {
      tag: E2E.TAG.CHROMIUM_ONLY,
    },
    async ({ page }, testInfo) => {
      // Playwright takes no in-memory file over 50 MB: the parts are written to disk.
      const parts = await Promise.all(
        Array.from({ length: 6 }, async (_, index) => {
          const path = testInfo.outputPath(`part-${index}.jpg`);
          await writeFile(path, Buffer.alloc(PART_BYTES));
          return path;
        })
      );
      await signInAsAdmin(page);
      await openAdd(page);
      await pick(page, parts);
      await expect(page.getByText(t.form.field.totalTooLarge)).toBeVisible();
      await expect(rowOf(page, 5)).toBeVisible();
      await expect(rowOf(page, 6)).toHaveCount(0);
    }
  );
});

test.describe("Add: what the form checks before it sends", () => {
  test("an alt text over the limit is named and nothing is sent", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await openAdd(page);
    await pick(page, PHOTO);
    await altField(rowOf(page, 1), "English").fill(
      "a".repeat(MAX_ALT_LENGTH + 1)
    );
    await submitAdd(page);
    await expect(page.getByText(t.form.field.altTooLong)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${BACK_OFFICE.PAGE.STORAGE_IMAGES}/new$`)
    );
  });

  test("a picture in no App is named and nothing is sent", async ({ page }) => {
    await signInAsAdmin(page);
    await openAdd(page);
    await pick(page, PHOTO);
    await backOfficeToggle(rowOf(page, 1), t.form.appOut).click();
    await submitAdd(page);
    await expect(page.getByText(t.form.field.appsRequired)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${BACK_OFFICE.PAGE.STORAGE_IMAGES}/new$`)
    );
  });
});

test.describe("Add: what the API refuses", () => {
  for (const [label, file] of [
    ["a text file", TEXT_FILE],
    ["a file no decoder reads", NOT_A_PICTURE],
  ] as const) {
    test(`${label} is refused, the row and its typed alt stay, and the refusal leaves with the row`, async ({
      page,
    }, { project }) => {
      const alt = altOf(project.name, "refused");
      await signInAsAdmin(page);
      await openAdd(page);
      await pick(page, [file]);
      await fillRow(page, 1, alt);
      await submitAdd(page);
      await expect(page.getByText(t.add.error.unsupported)).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(`${BACK_OFFICE.PAGE.STORAGE_IMAGES}/new$`)
      );
      await expect(altField(rowOf(page, 1), "English")).toHaveValue(alt);
      // Typing keeps it: the same files are still going to be sent.
      await altField(rowOf(page, 1), "English").fill(`${alt}!`);
      await expect(page.getByText(t.add.error.unsupported)).toBeVisible();
      await page
        .getByRole("button", {
          name: enT("Images.add.row.remove", { name: file.name }),
        })
        .click();
      await expect(page.getByText(t.add.pick.none)).toBeVisible();
      await expect(page.getByText(t.add.error.unsupported)).toHaveCount(0);
      await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
      await expect(imageLink(page, alt)).toHaveCount(0);
    });
  }

  test("one bad file rejects the whole batch, and the good one goes once the bad one is removed", async ({
    page,
  }, { project }) => {
    const alts = [1, 2].map((n) => `${altOf(project.name, "batch")} ${n}`);
    await signInAsAdmin(page);
    await openAdd(page);
    await pickGoodAndBroken(page, alts);
    // WebKit on a phone sometimes drops this tap. A refused batch adds nothing, so submitting again is safe.
    await expect(async () => {
      await submitAdd(page);
      await expect(page.getByText(t.add.error.unsupported)).toBeVisible({
        timeout: REFUSAL_WAIT_MS,
      });
    }).toPass();
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    // All or nothing: the good picture was not added either.
    await expect(imageLink(page, alts[0] ?? "")).toHaveCount(0);

    await openAdd(page);
    await pickGoodAndBroken(page, alts);
    await page
      .getByRole("button", {
        name: enT("Images.add.row.remove", { name: NOT_A_PICTURE.name }),
      })
      .click();
    await submitAdd(page);
    await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await expect(imageLink(page, alts[0] ?? "").first()).toBeVisible();
    await deleteFromList(page, alts[0] ?? "");
  });
});

test.describe("Signed out", () => {
  for (const [label, address] of [
    ["the list", BACK_OFFICE.PAGE.STORAGE_IMAGES],
    ["the Add page", `${BACK_OFFICE.PAGE.STORAGE_IMAGES}${IMAGES.PATH.NEW}`],
    ["an Image's page", imageHref("some-image")],
  ] as const) {
    test(`${label} sends a visitor without a Session to Sign in`, async ({
      page,
    }) => {
      await page.goto(address);
      await expect(page).toHaveURL(SIGN_IN_URL);
    });
  }
});

test.describe("Edit: what a save does", () => {
  test("access and Apps are kept, and the Edit page opens on them", async ({
    page,
  }, { project }) => {
    const alt = altOf(project.name, "access");
    await signInAsAdmin(page);
    await addPhoto(page, alt);
    await openFromList(page, alt);
    const form = editForm(page);
    // A new Image is private; make it public.
    await form
      .getByRole("button", { exact: true, name: t.access.PUBLIC })
      .click();
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await openFromList(page, alt);
    await expect(
      editForm(page).getByRole("button", {
        exact: true,
        name: t.access.PUBLIC,
      })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      backOfficeToggle(editForm(page), t.form.appIn)
    ).toHaveAttribute("aria-current", "page");
    await deleteOpened(page);
  });

  test("an alt text over the limit is named on the form and nothing is saved", async ({
    page,
  }, { project }) => {
    const alt = altOf(project.name, "toolong");
    await signInAsAdmin(page);
    await addPhoto(page, alt);
    await openFromList(page, alt);
    await altField(editForm(page), "English").fill(
      "a".repeat(MAX_ALT_LENGTH + 1)
    );
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(page.getByText(t.form.field.altTooLong)).toBeVisible();
    await expect(editForm(page)).toBeVisible();
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await deleteFromList(page, alt);
  });
});

test.describe("Edit: another Admin got there first", () => {
  test("a save on an Image changed meanwhile is refused, keeps what was typed, and a reload shows the other change", async ({
    page,
    browser,
    baseURL,
    storageState,
  }, { project }) => {
    const alt = altOf(project.name, "conflict");
    await signInAsAdmin(page);
    await addPhoto(page, alt);
    await openFromList(page, alt);
    const other = await otherAdmin(browser, { baseURL, storageState });
    await other.page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await openFromList(other.page, alt);

    // The other Admin saves first.
    await altField(editForm(other.page), "English").fill(`${alt} by other`);
    await other.page.getByRole("button", { name: t.edit.submit }).click();
    await expect(other.page).toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);

    // This one saves on the version they opened: refused, nothing lost.
    await altField(editForm(page), "English").fill(`${alt} by me`);
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: enT("Common.Request.changed") })
    ).toBeVisible();
    await expect(altField(editForm(page), "English")).toHaveValue(
      `${alt} by me`
    );
    await expect(page).not.toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);

    // A reload reads what the other Admin saved.
    await page.reload();
    await expect(altField(editForm(page), "English")).toHaveValue(
      `${alt} by other`
    );
    await deleteOpened(page);
    await other.context.close();
  });

  test("a save on an Image deleted meanwhile says it is gone", async ({
    page,
    browser,
    baseURL,
    storageState,
  }, { project }) => {
    const alt = altOf(project.name, "gone");
    await signInAsAdmin(page);
    await addPhoto(page, alt);
    await openFromList(page, alt);
    const other = await otherAdmin(browser, { baseURL, storageState });
    await other.page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await deleteFromList(other.page, alt);

    await altField(editForm(page), "English").fill(`${alt} late`);
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.edit.error.gone })
    ).toBeVisible();
    await other.context.close();
  });

  test("an Image deleted by another Admin is the not-found page for whoever opens it next", async ({
    page,
    browser,
    baseURL,
    storageState,
  }, { project }) => {
    const alt = altOf(project.name, "deleted");
    await signInAsAdmin(page);
    await addPhoto(page, alt);
    const id = await idOf(page, alt);
    const other = await otherAdmin(browser, { baseURL, storageState });
    await other.page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await deleteFromList(other.page, alt);
    await other.context.close();

    await page.goto(imageHref(id));
    await expect(
      page.getByRole("heading", { name: enT("Common.NotFound.title") })
    ).toBeVisible();
  });

  test("an address that is no Image is the not-found page", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(imageHref("no-such-image-id"));
    await expect(
      page.getByRole("heading", { name: enT("Common.NotFound.title") })
    ).toBeVisible();
  });
});

test.describe("Delete: several Images, one already gone", () => {
  test("it says how many went and how many were already gone", async ({
    page,
    browser,
    baseURL,
    storageState,
  }, { project }) => {
    const alts = [1, 2].map((n) => `${altOf(project.name, "bulk")} ${n}`);
    await signInAsAdmin(page);
    await addPhoto(page, alts[0] ?? "");
    await addPhoto(page, alts[1] ?? "");
    await page.reload();
    const other = await otherAdmin(browser, { baseURL, storageState });
    await other.page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await deleteFromList(other.page, alts[1] ?? "");
    await other.context.close();

    // This browser's list still shows both: it is kept for a few minutes.
    await selectInList(page, alts[0] ?? "");
    await selectInList(page, alts[1] ?? "");
    await page
      .getByRole("button", { name: t.delete.action })
      .filter({ visible: true })
      .click();
    await page.getByRole("button", { name: t.delete.confirm }).click();
    await expect(
      page.getByText(enT("Images.delete.partly", { deleted: 1, gone: 1 }))
    ).toBeVisible();
    await Promise.all(
      alts.map((alt) => expect(imageLink(page, alt)).toHaveCount(0))
    );
  });
});

/** An Image in the Back Office and in Laura, which a Back Office Admin cannot change: Laura's Admins can. */
const SHARED_ALT = FIXTURE.IMAGE.IN_BOTH_APPS.alt.en;

test.describe("An Image that is also in an App the Admin does not administer", () => {
  test("a save is refused by the API, says so, and the Image stays as it was", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await searchFor(page, SHARED_ALT);
    await openFromList(page, SHARED_ALT);
    await altField(editForm(page), "English").fill(`${SHARED_ALT} changed`);
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.edit.error.refused })
    ).toBeVisible();
    await expect(page).not.toHaveURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await page.reload();
    await expect(altField(editForm(page), "English")).toHaveValue(SHARED_ALT);
  });

  test("taking it out of Laura is refused too", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await searchFor(page, SHARED_ALT);
    await openFromList(page, SHARED_ALT);
    await editForm(page)
      .getByRole("radiogroup", { name: APP_ENTRY[App.LAURA].name })
      .getByRole("button", { exact: true, name: t.form.appOut })
      .click();
    await page.getByRole("button", { name: t.edit.submit }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.edit.error.refused })
    ).toBeVisible();
  });

  test("deleting it is refused with a toast, and it stays in the list", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await searchFor(page, SHARED_ALT);
    await openFromList(page, SHARED_ALT);
    await page.getByRole("button", { name: t.delete.action }).click();
    await page.getByRole("button", { name: t.delete.confirm }).click();
    await expect(page.getByText(t.delete.failed)).toBeVisible();
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await searchFor(page, SHARED_ALT);
  });
});

/**
 * What a page may move once it has loaded. Google's "good" line is 0.1. The
 * Edit page measures about 0; the Add page about 0.05, all of it app-wide
 * decoration, not its skeleton: its card's huge brush kanji when the font
 * swaps in (0.044) and the Gooey toggles' canvases settling (0.007). A
 * skeleton the wrong size moves the whole form, far past either.
 */
const SHIFT_LIMIT = { ADD: 0.1, EDIT: 0.02 } as const;

/** What the browser records of one layout shift (Chromium's `LayoutShift`). */
type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  sources: {
    currentRect: DOMRectReadOnly;
    node: Node | null;
    previousRect: DOMRectReadOnly;
  }[];
  value: number;
};

/** The layout shift the page has had since it started, from the browser's own record, with what moved. */
const layoutShift = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ moved: string[]; total: number }>((resolve) => {
        const isShift = (entry: PerformanceEntry): entry is LayoutShiftEntry =>
          "value" in entry && "sources" in entry;
        let total = 0;
        const moved: string[] = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries().filter(isShift)) {
            if (entry.hadRecentInput) {
              continue;
            }
            total += entry.value;
            for (const { currentRect, node, previousRect } of entry.sources) {
              moved.push(
                `${Math.round(entry.startTime)}ms ${entry.value.toFixed(4)} ${node?.nodeName ?? "?"} y ${Math.round(previousRect.y)}->${Math.round(currentRect.y)} h ${Math.round(previousRect.height)}->${Math.round(currentRect.height)}`
              );
            }
          }
        });
        observer.observe({ buffered: true, type: "layout-shift" });
        setTimeout(() => {
          observer.disconnect();
          resolve({ moved, total });
        }, 500);
      })
  );

// The layout-shift record is Chromium's.
test.describe("The pages settle without moving", () => {
  test("the Add page's skeleton is the form's size", {
    tag: E2E.TAG.CHROMIUM_ONLY,
  }, async ({ page }) => {
    await signInAsAdmin(page);
    // A first visit has the brush kanji's font swap in (an app-wide shift of its own): load it before the page measured.
    await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await page.waitForLoadState("networkidle");
    await openAdd(page);
    await expect(addForm(page)).toBeVisible();
    const shift = await layoutShift(page);
    expect(shift.total, shift.moved.join("\n")).toBeLessThan(SHIFT_LIMIT.ADD);
  });

  test(
    "the Edit page's skeleton is the form's size",
    { tag: E2E.TAG.CHROMIUM_ONLY },
    async ({ page }, { project }) => {
      const alt = altOf(project.name, "shift");
      await signInAsAdmin(page);
      await addPhoto(page, alt);
      const id = await idOf(page, alt);
      // A fresh load, so nothing is kept from the list.
      await page.goto(imageHref(id));
      await expect(editForm(page)).toBeVisible();
      const shift = await layoutShift(page);
      expect(shift.total, shift.moved.join("\n")).toBeLessThan(
        SHIFT_LIMIT.EDIT
      );
      await deleteOpened(page);
    }
  );
});
