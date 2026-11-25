import { USER } from "@allonfire/auth/features/users/constants/users";
import { App } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import { expect, type Page, test } from "@playwright/test";
import { IMAGES } from "../src/features/images/constants/images";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { enT, itT } from "../src/shared/tests/translators";
import { onPhone, signInAsAdmin, USERS } from "./pages";

const LAURA = APP.ENTRY[App.LAURA].name;
const FIRST_OF_MONTH = /\b1st,/;
const SECOND_OF_MONTH = /\b2nd,/;
const SORT_TAB = new RegExp(`^${enT("List.tab.sort")}`);
const NOVEMBER_IN_ITALIAN = /novembre/;
const RANGE_IN_SEARCH = /^created:\d{4}-\d{2}-\d{2}/;
const VIEW_TAB = new RegExp(`^${enT("List.tab.view")}`);

/** A list's name, the param names and the Filter button it is read by. */
const USERS_LIST = {
  filters: enT("Users.filter.button"),
  hidden: LAURA,
  hide: USER.PARAM.HIDE,
  href: USERS,
  list: enT("Users.list"),
  search: USER.PARAM.SEARCH,
  sort: USER.PARAM.SORT,
  sortBy: enT("Users.column.created"),
  sorted: "created.desc",
};
const IMAGES_LIST = {
  filters: enT("Images.filter.button"),
  hidden: enT("Images.column.apps"),
  hide: IMAGES.PARAM.HIDE,
  href: BACK_OFFICE.PAGE.STORAGE_IMAGES,
  list: enT("Images.list"),
  search: IMAGES.PARAM.SEARCH,
  sort: IMAGES.PARAM.SORT,
  sortBy: enT("Images.column.size"),
  sorted: "size.desc",
};

const param = (page: Page, name: string) =>
  new URL(page.url()).searchParams.get(name);
const openPanel = async (page: Page, filters: string, tab?: RegExp) => {
  await page.getByRole("button", { name: filters }).click();
  if (tab) {
    await page.getByRole("tab", { name: tab }).click();
  }
};

for (const one of [USERS_LIST, IMAGES_LIST]) {
  test.describe(`${one.list} list: sort, view and range`, () => {
    test("sorts through the header menu, and a reload keeps it", async ({
      page,
    }) => {
      // A phone lists cards: no header menu (the Sort tab test covers it).
      if (onPhone(page)) {
        return;
      }
      await signInAsAdmin(page);
      await page.goto(one.href);
      await page
        .getByRole("columnheader", { name: one.sortBy })
        .getByRole("button")
        .click();
      await page
        .getByRole("menuitemcheckbox", { name: enT("List.column.desc") })
        .click();
      await expect.poll(() => param(page, one.sort)).toBe(one.sorted);
      await page.reload();
      expect(param(page, one.sort)).toBe(one.sorted);
      await openPanel(page, one.filters, SORT_TAB);
      await expect(
        page.getByRole("combobox", { name: enT("List.sort.column") })
      ).toContainText(one.sortBy);
    });

    test("hides a column from the View tab, and Show all brings it back", async ({
      page,
    }) => {
      // A phone lists cards: no columns to hide.
      if (onPhone(page)) {
        return;
      }
      await signInAsAdmin(page);
      await page.goto(one.href);
      const heading = page.getByRole("columnheader", { name: one.hidden });
      await expect(heading).toBeVisible();
      await openPanel(page, one.filters, VIEW_TAB);
      await page.getByRole("option", { name: one.hidden }).click();
      await expect(heading).toHaveCount(0);
      await expect.poll(() => param(page, one.hide)).not.toBeNull();
      await page
        .getByRole("button", { name: enT("List.view.showAll") })
        .click();
      await expect(heading).toBeVisible();
      await expect.poll(() => param(page, one.hide)).toBeNull();
    });

    test("a Created range goes into the search, and Clear takes it out", async ({
      page,
    }) => {
      await signInAsAdmin(page);
      await page.goto(one.href);
      await openPanel(page, one.filters);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: enT("Users.column.created") })
        .click();
      await page.getByRole("button", { name: FIRST_OF_MONTH }).first().click();
      await page.getByRole("button", { name: SECOND_OF_MONTH }).first().click();
      await expect.poll(() => param(page, one.search)).toMatch(RANGE_IN_SEARCH);
      // The calendar's popover is the last dialog opened.
      await page
        .getByRole("dialog")
        .last()
        .getByRole("button", { name: enT("List.range.clear") })
        .click();
      await expect.poll(() => param(page, one.search)).toBeNull();
    });

    test("the Sort tab sorts, on a phone too", async ({ page }) => {
      await signInAsAdmin(page);
      await page.goto(one.href);
      await openPanel(page, one.filters, SORT_TAB);
      await page
        .getByRole("dialog")
        .getByRole("button", { exact: true, name: enT("List.sort.add") })
        .click();
      await expect.poll(() => param(page, one.sort)).not.toBeNull();
      await page.reload();
      expect(param(page, one.sort)).not.toBeNull();
    });
  });
}

test("the Created calendar speaks the page's language", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/it${USERS}`);
  await page.getByRole("button", { name: itT("Users.filter.button") }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: itT("Users.column.created") })
    .click();
  await expect(
    page.getByRole("button", { name: NOVEMBER_IN_ITALIAN }).first()
  ).toBeVisible();
});
