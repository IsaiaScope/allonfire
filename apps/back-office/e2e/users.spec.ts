import { resolve } from "node:path";
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE_FIXTURE_FILES } from "@allonfire/storage/features/image/fixtures/constants/files";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};
import {
  SECTION,
  sectionHref,
} from "../src/features/navigation/constants/sections";
import { newUserHref, userHref } from "../src/features/users/utils/user-href";
import { APP_ENTRY } from "../src/shared/constants/apps";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { openSidebar, SIGN_IN_URL, signIn } from "./pages";

const t = EN.Users;
const USERS = sectionHref(SECTION.USERS.path);

/** Signs in as the Back Office Admin and waits for the frame. */
const signInAsAdmin = async (page: Page) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await expect(
    page.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
};

/** A User's email as drawn on screen: a table row, or a card on a phone. */
const emailOf = (page: Page, email: string) =>
  page
    .getByRole("button", { name: t.copy.label.replace("{email}", email) })
    .filter({ visible: true });

/** The row, or the card on a phone, that holds a User. */
const rowOf = (page: Page, email: string) =>
  page
    .getByRole("row")
    .or(page.getByRole("listitem"))
    .filter({ has: emailOf(page, email) });

test("sends the first page with the HTML, already filled", async ({ page }) => {
  await signInAsAdmin(page);
  const html = await (await page.request.get(USERS)).text();
  expect(html).toContain(FIXTURE.USER.NO_MEMBERSHIP.email);
});

test("filters by App and Role from the address", async ({ page }) => {
  await signInAsAdmin(page);
  const search = encodeURIComponent(
    USER_SEARCH.serialize({ app: [App.LAURA], role: [Role.ADMIN], text: "" })
  );
  await page.goto(`${USERS}?${USER.PARAM.SEARCH}=${search}`);
  await expect(emailOf(page, FIXTURE.USER.LAURA.ADMIN.email)).toBeVisible();
  await expect(emailOf(page, FIXTURE.USER.BACK_OFFICE.ADMIN.email)).toHaveCount(
    0
  );
});

test("reads a hand-edited page and page size as the defaults", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(`${USERS}?${USER.PARAM.PAGE}=abc&${USER.PARAM.PER_PAGE}=7`);
  await expect(
    page.getByRole("combobox", { name: t.pagination.rowsPerPage })
    // Base UI's select icon adds a glyph after the value.
  ).toHaveText(new RegExp(`^${USER.DEFAULT_PAGE_SIZE}`));
  await expect(emailOf(page, FIXTURE.USER.NO_MEMBERSHIP.email)).toBeVisible();
});

test("opens a User's page, still under Users", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(USERS);
  const row = rowOf(page, FIXTURE.USER.NO_MEMBERSHIP.email);
  const href = await row.getByRole("link").getAttribute("href");
  // Off the email, which copies: the row's link covers the rest of it.
  await row.click();
  await expect(page).toHaveURL((url) => url.pathname === href);
  await expect(page.getByText(t.detail.title)).toBeVisible();
  await openSidebar(page);
  await expect(
    page
      .getByRole("navigation", { name: EN.Navigation.menu })
      .filter({ visible: true })
      .getByRole("link", { name: EN.Navigation.users })
  ).toHaveAttribute("aria-current", "page");
});

test("sends a signed-out visit to a User's page to Sign in", async ({
  page,
}) => {
  await page.goto(`${USERS}/someone`);
  await expect(page).toHaveURL(SIGN_IN_URL);
});

/** A User's selection checkbox as drawn on screen: a table row, or a card. */
const checkboxOf = (page: Page, email: string) =>
  page
    .getByRole("checkbox", { name: t.delete.select.replace("{email}", email) })
    .filter({ visible: true });

test("your own row has no checkbox", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(USERS);
  await expect(
    checkboxOf(page, FIXTURE.USER.NO_MEMBERSHIP.email)
  ).toBeVisible();
  await expect(
    checkboxOf(page, FIXTURE.USER.BACK_OFFICE.ADMIN.email)
  ).toHaveCount(0);
});

test("selecting a User enables Delete; it asks first and Cancel deletes nobody", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(USERS);
  const remove = page.getByRole("button", {
    exact: true,
    name: t.delete.action,
  });
  await expect(remove).toBeDisabled();
  await checkboxOf(page, FIXTURE.USER.NO_MEMBERSHIP.email).click();
  await remove.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText(t.delete.description)).toBeVisible();
  await dialog.getByRole("button", { name: t.delete.cancel }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(emailOf(page, FIXTURE.USER.NO_MEMBERSHIP.email)).toBeVisible();
});

test("filters by App through the Filter panel's list", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(USERS);
  await page.getByRole("button", { name: t.filter.button }).click();
  await page.getByRole("button", { name: t.filter.app }).click();
  const laura = APP_ENTRY[App.LAURA].name;
  await page
    .getByRole("combobox", { name: t.filter.search })
    .fill(laura.slice(0, 3));
  await page.getByRole("option", { name: laura }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get(USER.PARAM.SEARCH))
    .toBe(USER_SEARCH.serialize({ app: [App.LAURA], text: "" }));
  await expect(emailOf(page, FIXTURE.USER.BACK_OFFICE.ADMIN.email)).toHaveCount(
    0
  );
});

/** A User this project adds, its email unique to the run and the project. */
const addedBy = (project: string) => ({
  email: `add-${project}-${Date.now()}@e2e.test`,
  name: "Added",
  password: "An-e2e-password-1",
});

/**
 * The Add page's form; a role query skips the hidden copy Next keeps of a
 * page it has left, which a label query would also find.
 */
const addForm = (page: Page) => page.getByRole("form", { name: t.add.title });

/** Fills the Add page and adds the User as a Back Office Admin. */
const addUser = async (page: Page, user: ReturnType<typeof addedBy>) => {
  const form = addForm(page);
  await form.getByLabel(t.add.email, { exact: true }).fill(user.email);
  await form.getByLabel(t.add.name, { exact: true }).fill(user.name);
  await form.getByLabel(t.add.password, { exact: true }).fill(user.password);
  await form
    .getByLabel(t.add.confirmPassword, { exact: true })
    .fill(user.password);
  await form
    .getByRole("radiogroup", {
      name: t.add.role.replace("{app}", APP_ENTRY[App.BACK_OFFICE].name),
    })
    .getByRole("button", { name: EN.Navigation.role[Role.ADMIN] })
    .click();
  await form.getByRole("button", { name: t.add.submit }).click();
};

test("adds a User from the list's Add button; they sign in with the password the Admin typed", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  await page.goto(USERS);
  await page.getByRole("link", { exact: true, name: t.add.button }).click();
  await expect(page.getByRole("heading", { name: t.add.title })).toBeVisible();
  const user = addedBy(info.project.name);
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  await expect(emailOf(page, user.email).first()).toBeVisible();

  const context = await browser.newContext();
  const added = await context.newPage();
  await signIn(added, user, { password: user.password });
  await expect(
    added.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  await context.close();
});

test("a taken email says so on the email field", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  await addUser(page, {
    ...addedBy("taken"),
    email: FIXTURE.USER.LAURA.ADMIN.email,
  });
  await expect(page.getByText(t.add.error.taken)).toBeVisible();
  await expect(
    addForm(page).getByLabel(t.add.email, { exact: true })
  ).toHaveAttribute("aria-invalid", "true");
});

test("leaving Add a User and coming back opens it empty, the last answer gone", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  await addUser(page, {
    ...addedBy("left"),
    email: FIXTURE.USER.LAURA.ADMIN.email,
  });
  await expect(page.getByText(t.add.error.taken)).toBeVisible();
  await addForm(page).getByRole("link", { name: t.add.cancel }).click();
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  await page.getByRole("link", { exact: true, name: t.add.button }).click();
  await expect(
    addForm(page).getByLabel(t.add.email, { exact: true })
  ).toHaveValue("");
  await expect(page.getByText(t.add.error.taken)).toHaveCount(0);
});

test("deletes a User it added: confirmed, they leave the list", async ({
  page,
}, info) => {
  await signInAsAdmin(page);
  await page.addLocatorHandler(
    page.getByRole("button", {
      name: SHARED_TRANSLATIONS.en.Common.Install.dismiss,
    }),
    (dismiss) => dismiss.click()
  );
  await page.goto(newUserHref());
  const user = addedBy(`${info.project.name}-deleted`);
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  // A visit of its own keeps the list on the server: only the deletion's
  // `updateTag` drops it, so the reload below shows the User gone.
  await page.reload();
  await expect(emailOf(page, user.email).first()).toBeVisible();
  await checkboxOf(page, user.email).click();
  await page
    .getByRole("button", { exact: true, name: t.delete.action })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: t.delete.confirm })
    .click();
  // The API answered: only now can a reload not cut the request short.
  await expect(page.getByText("1 User deleted")).toBeVisible();
  await expect(emailOf(page, user.email)).toHaveCount(0);
  await page.reload();
  await expect(emailOf(page, FIXTURE.USER.NO_MEMBERSHIP.email)).toBeVisible();
  await expect(emailOf(page, user.email)).toHaveCount(0);
});

// A route param, not a real User: the page's title and address need none.
const SOME_USER = "some-id";

for (const { path, title } of [
  { path: newUserHref(), title: IT.Users.add.title },
  { path: userHref(SOME_USER), title: IT.Users.detail.page },
]) {
  test(`gives ${path} its own title and link preview`, async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`/it${path}`);
    await expect(page).toHaveTitle(pageTitle(title, BACK_OFFICE.NAME));
    await expect(
      page.locator('meta[property="og:url"]').first()
    ).toHaveAttribute("content", `${LOCAL.URL.BACK_OFFICE_E2E}/it${path}`);
  });
}

/** A User's picture in their row, or their card on a phone. */
const pictureOf = (page: Page, email: string) =>
  rowOf(page, email).locator(`img[src^="${LOCAL.URL.IMAGE_SERVER}"]`).first();

/** Adds a User with a photo cropped in the dialog, and waits for the list. */
const addUserWithPicture = async (
  page: Page,
  user: ReturnType<typeof addedBy>
) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  await addForm(page)
    .locator('input[type="file"][name="avatar"]')
    .setInputFiles(resolve(IMAGE_FIXTURE_FILES, "photo.jpg"));
  await page
    .getByRole("button", { exact: true, name: t.add.avatar.use })
    .click();
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
};

test("adds a User with a picture: the list shows it", async ({
  page,
}, info) => {
  const user = addedBy(`${info.project.name}-pictured`);
  await addUserWithPicture(page, user);
  const picture = pictureOf(page, user.email);
  await expect(picture).toBeVisible();
  await expect
    .poll(() =>
      picture.evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0);
});

test("deleting that User removes the picture", async ({ page }, info) => {
  const user = addedBy(`${info.project.name}-unpictured`);
  await addUserWithPicture(page, user);
  const link = await pictureOf(page, user.email).getAttribute("src");
  expect((await page.request.get(link ?? "")).status()).toBe(HTTP.STATUS.OK);
  await checkboxOf(page, user.email).click();
  await page
    .getByRole("button", { exact: true, name: t.delete.action })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: t.delete.confirm })
    .click();
  await expect(page.getByText("1 User deleted")).toBeVisible();
  // Dead once the image cache asked imgproxy again.
  await expect
    .poll(async () => (await page.request.get(link ?? "")).status(), {
      timeout: (IMAGE_SERVER.CACHE_CHECK_SECONDS + 1) * UNIT.MS_PER_SECOND,
    })
    .toBe(HTTP.STATUS.NOT_FOUND);
});
