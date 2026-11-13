import { E2E } from "@allonfire/config/tests/e2e/run";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { instant } from "@next/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { newImageHref } from "../src/features/images/utils/image-href";
import { SECTION } from "../src/features/navigation/constants/sections";
import { sectionHref } from "../src/features/navigation/utils/sections";
import { newUserHref } from "../src/features/users/utils/user-href";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { enT } from "../src/shared/tests/translators";
import { imageLink } from "./images-flow";
import {
  onPhone,
  openSidebar,
  rowOf,
  signInAsAdmin,
  tapSidebarLink,
  USERS,
  usersSearchHref,
} from "./pages";

// What a link prefetches is ready the moment it is clicked: inside
// `instant()` a navigation shows only what was prefetched, and the rest
// waits for the callback to end (ADR 0028). Runs against the production
// build, the only one that prefetches.

const t = EN.Users;
const HOME = sectionHref(SECTION.HOME.path);
const MAIL = sectionHref(BACK_OFFICE.PAGE.SERVICES_MAIL);
const SHOWN = FIXTURE.USER.NO_MEMBERSHIP;

/** Any User's email in the list: the rows came with the page. */
const anyEmail = (page: Page) =>
  page
    .getByRole("button", { name: enT("Users.copy.label", { email: "" }) })
    .filter({ visible: true })
    .first();

/** The link that opens a User from their row, or their card on a phone. */
const openLinkOf = (page: Page, email: string) =>
  rowOf(page, email).getByRole("link");

const toUsers = (url: URL) => url.pathname === USERS;

/** Opens the page of the User the tests open, from their row's link. */
const openShown = async (page: Page) => {
  await page.goto(usersSearchHref(SHOWN.email));
  const href = (await openLinkOf(page, SHOWN.email).getAttribute("href")) ?? "";
  await page.goto(href);
  await expect(page.getByRole("heading", { name: SHOWN.email })).toBeVisible();
};

test("Cancel on a User opens the list with its rows already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await openShown(page);
  await instant(page, async () => {
    await page.getByRole("link", { name: t.form.cancel }).click();
    await page.waitForURL(toUsers);
    await expect(anyEmail(page)).toBeVisible();
  });
});

test("Cancel on Add a User opens the list with its rows already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  const cancel = page.getByRole("link", { name: t.form.cancel });
  await expect(cancel).toBeVisible();
  await instant(page, async () => {
    await cancel.click();
    await page.waitForURL(toUsers);
    await expect(anyEmail(page)).toBeVisible();
  });
});

test("the breadcrumb's Users opens the list with its rows already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await openShown(page);
  await instant(page, async () => {
    await page
      .getByRole("navigation", { name: EN.Navigation.breadcrumb })
      .getByRole("link", { name: EN.Navigation.users })
      .click();
    await page.waitForURL(toUsers);
    await expect(anyEmail(page)).toBeVisible();
  });
});

test("the sidebar's Users link opens the list with its rows already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(HOME);
  await instant(page, async () => {
    await tapSidebarLink(page, EN.Navigation.users);
    await page.waitForURL(toUsers);
    await expect(anyEmail(page)).toBeVisible();
  });
});

/**
 * Reaches for a row's link, so its prefetch starts before the lock (a pointer
 * over it, or on a phone a finger landing), and answers where it goes.
 */
const reachFor = async (page: Page, link: Locator) => {
  const href = (await link.getAttribute("href")) ?? "";
  await (onPhone(page) ? link.dispatchEvent("pointerdown") : link.hover());
  return href;
};

test("a User row reached for opens the form already filled", {
  tag: E2E.TAG.CHROMIUM_ONLY,
}, async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(usersSearchHref(SHOWN.email));
  const link = openLinkOf(page, SHOWN.email);
  const href = await reachFor(page, link);
  await instant(page, async () => {
    await link.click();
    await page.waitForURL((url) => url.pathname === href);
    await expect(
      page.getByRole("heading", { name: SHOWN.email })
    ).toBeVisible();
  });
});

test("the sidebar's Email link opens the providers already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(HOME);
  await openSidebar(page);
  const menu = page
    .getByRole("navigation", { name: EN.Navigation.menu })
    .filter({ visible: true });
  // The Services group opens first, so its link is on screen to prefetch.
  await menu.getByRole("button", { name: EN.Navigation.services }).click();
  await page.waitForLoadState("networkidle");
  await instant(page, async () => {
    await menu.getByRole("link", { name: EN.Navigation.mail }).click();
    await page.waitForURL((url) => url.pathname === MAIL);
    await expect(page.getByRole("form", { name: "Provider 1" })).toBeVisible();
  });
});

test("Cancel on Add Images opens the list with its toolbar already there", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newImageHref());
  const cancel = page.getByRole("link", { name: EN.Images.form.cancel });
  await expect(cancel).toBeVisible();
  await instant(page, async () => {
    await cancel.click();
    await page.waitForURL(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    await expect(
      page.getByRole("link", { name: EN.Images.add.button })
    ).toBeVisible();
  });
});

test("an Image row reached for opens the form already filled", {
  tag: E2E.TAG.CHROMIUM_ONLY,
}, async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  // A Fixture Image: the newest rows are other tests' pictures, added and deleted as these run.
  const link = imageLink(page, FIXTURE.IMAGE.HEIC_IN_BACK_OFFICE.alt.en)
    .filter({ visible: true })
    .first();
  const href = await reachFor(page, link);
  await instant(page, async () => {
    await link.click();
    await page.waitForURL((url) => url.pathname === href);
    await expect(
      page.getByRole("form", { name: EN.Images.edit.title })
    ).toBeVisible();
  });
});
