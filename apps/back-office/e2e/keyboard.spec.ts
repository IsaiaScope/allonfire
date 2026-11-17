import { USER } from "@allonfire/auth/features/users/constants/users";
import { expect, type Page, test } from "@playwright/test";
import { enT } from "../src/shared/tests/translators";
import { onPhone, signInAsAdmin, USERS } from "./pages";

const FILTERS = enT("Users.filter.button");
const SORT_TAB = new RegExp(`^${enT("List.tab.sort")}`);
const VIEW_TAB = new RegExp(`^${enT("List.tab.view")}`);
const RANGE_IN_SEARCH = /created:\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}/;
const FILTER_TAB = new RegExp(`^${enT("List.tab.filter")}`);

const param = (page: Page, name: string) =>
  new URL(page.url()).searchParams.get(name);

/** The dialog holds the keyboard focus. */
const focusInside = (page: Page) =>
  expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);

/** Reaches the Filter button as a keyboard does, then opens the panel with Enter. */
const openWithKeyboard = async (page: Page) => {
  await page.getByRole("button", { name: FILTERS }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
};

test.describe("Users list: the Filter panel without a mouse", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(USERS);
  });

  test("opens on Enter, holds the focus, and Escape gives it back", async ({
    page,
  }) => {
    await openWithKeyboard(page);
    await focusInside(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: FILTERS })).toBeFocused();
  });

  test("walks the tabs with the arrow keys (three, two on a phone), one stop on the tab list", async ({
    page,
  }) => {
    await openWithKeyboard(page);
    await page.getByRole("tab", { name: FILTER_TAB }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: SORT_TAB })).toBeFocused();
    if (onPhone(page)) {
      // A phone has no View tab: the columns are a desktop's.
      await expect(page.getByRole("tab", { name: VIEW_TAB })).toHaveCount(0);
      await page.keyboard.press("ArrowLeft");
      await expect(page.getByRole("tab", { name: FILTER_TAB })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      return;
    }
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: VIEW_TAB })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: SORT_TAB })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("adds, sets and drags sorts, and removes one", async ({ page }) => {
    // dnd-kit's keyboard drag is for a hardware keyboard, which a phone has none of.
    if (onPhone(page)) {
      return;
    }
    await openWithKeyboard(page);
    await page.getByRole("tab", { name: FILTER_TAB }).focus();
    await page.keyboard.press("ArrowRight");
    const dialog = page.getByRole("dialog");
    const add = dialog.getByRole("button", {
      exact: true,
      name: enT("List.sort.add"),
    });
    await add.focus();
    await page.keyboard.press("Enter");
    await add.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => param(page, USER.PARAM.SORT))
      .toBe("email.asc,created.asc");
    // dnd-kit's keyboard drag: Space lifts, an arrow moves, Space drops.
    const handle = dialog
      .getByRole("button", { name: enT("List.sort.drag") })
      .first();
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    // dnd-kit measures the rows once it lifts one; an arrow before that moves nothing.
    await page.waitForTimeout(200);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect
      .poll(() => param(page, USER.PARAM.SORT))
      .toBe("created.asc,email.asc");
    await dialog
      .getByRole("button", { name: enT("List.sort.remove") })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => param(page, USER.PARAM.SORT)).toBe("email.asc");
  });

  test("hides a column from the View tab: type, arrow down, Enter", async ({
    page,
  }) => {
    if (onPhone(page)) {
      return;
    }
    await openWithKeyboard(page);
    await page.getByRole("tab", { name: FILTER_TAB }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("combobox", { name: enT("List.view.search") })
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect.poll(() => param(page, USER.PARAM.HIDE)).not.toBeNull();
  });

  test("picks a Created range with the keyboard", async ({ page }) => {
    await openWithKeyboard(page);
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: enT("Users.column.created") })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("grid")).toBeVisible();
    await page.getByRole("gridcell").first().locator("button").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect
      .poll(() => param(page, USER.PARAM.SEARCH))
      .toMatch(RANGE_IN_SEARCH);
  });
});

test.describe("Users list: the table without a mouse", () => {
  test("opens a header menu with Enter and sorts from it", async ({ page }) => {
    if (onPhone(page)) {
      return;
    }
    await signInAsAdmin(page);
    await page.goto(USERS);
    await page
      .getByRole("columnheader", { name: enT("Users.column.created") })
      .getByRole("button")
      .focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect.poll(() => param(page, USER.PARAM.SORT)).not.toBeNull();
  });

  test("reaches a row's link with Tab and opens it with Enter", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(USERS);
    // A row of the table, or a card on a phone: the one holding a Copy button.
    const link = page
      .getByRole("row")
      .or(page.getByRole("listitem"))
      .filter({
        has: page
          .getByRole("button", {
            name: enT("Users.copy.label", { email: "" }),
          })
          .filter({ visible: true }),
      })
      .first()
      .getByRole("link");
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(new RegExp(`${USERS}$`));
  });
});
