import { E2E } from "@allonfire/config/tests/e2e/run";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { instant } from "@next/playwright";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import {
  SECTION,
  sectionHref,
} from "../src/features/navigation/constants/sections";
import { newUserHref } from "../src/features/users/utils/user-href";
import {
  onPhone,
  openSidebar,
  rowOf,
  signInAsAdmin,
  USERS,
  usersSearchHref,
} from "./pages";

// What a link prefetches is ready the moment it is clicked: inside
// `instant()` a navigation shows only what was prefetched, and the rest
// waits for the callback to end (ADR 0028). Runs against the production
// build, the only one that prefetches.

const t = EN.Users;
const HOME = sectionHref(SECTION.HOME.path);
const SHOWN = FIXTURE.USER.NO_MEMBERSHIP;

/** Any User's email in the list: the rows came with the page. */
const anyEmail = (page: Page) =>
  page
    .getByRole("button", { name: t.copy.label.replace("{email}", "") })
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
    // A phone's drawer brings its links into view only on opening. Its
    // prefetch runs inside the lock: taking the lock makes the router fetch
    // an earlier prefetch again at the tap, and the tap could beat it.
    await openSidebar(page);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("navigation", { name: EN.Navigation.menu })
      .filter({ visible: true })
      .getByRole("link", { name: EN.Navigation.users })
      .click();
    await page.waitForURL(toUsers);
    await expect(anyEmail(page)).toBeVisible();
  });
});

test("a User row reached for opens the form already filled", {
  tag: E2E.TAG.CHROMIUM_ONLY,
}, async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(usersSearchHref(SHOWN.email));
  const link = openLinkOf(page, SHOWN.email);
  const href = (await link.getAttribute("href")) ?? "";
  // Reaching for the row starts its prefetch, before the lock: a pointer
  // over it, or on a phone a finger landing. A phone's plain tap reaching
  // the User is checked on every project in users.spec.ts.
  await (onPhone(page) ? link.dispatchEvent("pointerdown") : link.hover());
  await instant(page, async () => {
    await link.click();
    await page.waitForURL((url) => url.pathname === href);
    await expect(
      page.getByRole("heading", { name: SHOWN.email })
    ).toBeVisible();
  });
});
