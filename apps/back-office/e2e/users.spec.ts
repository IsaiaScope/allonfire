import { resolve } from "node:path";
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
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
  await expect(
    page.getByRole("heading", { name: FIXTURE.USER.NO_MEMBERSHIP.email })
  ).toBeVisible();
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
/** The picture field's drop area input, the one a visitor picks with: the
 *  field posts through its own input, named as the field. */
const picturePicker = (page: Page) =>
  addForm(page).locator('input[type="file"]:not([name])');

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

/** A User's own page, as their row links it. */
const userPathOf = async (page: Page, email: string) => {
  await page.goto(USERS);
  return (
    (await rowOf(page, email).getByRole("link").getAttribute("href")) ?? ""
  );
};

for (const { name, path, title } of [
  {
    name: "the Users list",
    path: () => Promise.resolve(USERS),
    title: IT.Navigation.users,
  },
  {
    name: "Add a User",
    path: () => Promise.resolve(newUserHref()),
    title: IT.Users.add.title,
  },
  {
    name: "a User's page",
    path: (page: Page) => userPathOf(page, FIXTURE.USER.NO_MEMBERSHIP.email),
    title: IT.Users.detail.page,
  },
]) {
  test(`gives ${name} its own title and link preview`, async ({ page }) => {
    await signInAsAdmin(page);
    const at = await path(page);
    await page.goto(`/it${at}`);
    await expect(page).toHaveTitle(pageTitle(title, BACK_OFFICE.NAME));
    await expect(
      page.locator('meta[property="og:url"]').first()
    ).toHaveAttribute("content", `${LOCAL.URL.BACK_OFFICE_E2E}/it${at}`);
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
  await picturePicker(page).setInputFiles(
    resolve(IMAGE_FIXTURE_FILES, "photo.jpg")
  );
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
      timeout: IMAGE_SERVER.GONE_WITHIN_MS,
    })
    .toBe(HTTP.STATUS.NOT_FOUND);
});

/** The edit form on a User's page, named by its heading: their email. */
const editForm = (page: Page, name: string) => page.getByRole("form", { name });

/** Saves the edit form and waits for the list. */
const saveEdit = async (page: Page, name: string) => {
  await editForm(page, name)
    .getByRole("button", { name: t.edit.submit })
    .click();
  await expect(
    page.getByText(t.edit.saved, { exact: true }).first()
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
};

test("renames a User and changes their Laura Role; the list shows both", async ({
  page,
}, info) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  const user = addedBy(`${info.project.name}-edited`);
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  await page.goto(await userPathOf(page, user.email));
  const form = editForm(page, user.email);
  await form.getByLabel(t.add.name, { exact: true }).fill("Renamed");
  await form
    .getByRole("radiogroup", {
      name: t.add.role.replace("{app}", APP_ENTRY[App.LAURA].name),
    })
    .getByRole("button", { name: EN.Navigation.role[Role.VIEWER] })
    .click();
  await saveEdit(page, user.email);
  const row = rowOf(page, user.email).first();
  await expect(row).toContainText("Renamed");
  await expect(row).toContainText(EN.Navigation.role[Role.VIEWER]);
});

test("a new password lets the User sign in with it", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  const user = addedBy(`${info.project.name}-repassworded`);
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  await page.goto(await userPathOf(page, user.email));
  const password = "A-newer-e2e-password-2";
  const form = editForm(page, user.email);
  await form.getByLabel(t.edit.password, { exact: true }).fill(password);
  await form.getByLabel(t.edit.confirmPassword, { exact: true }).fill(password);
  await saveEdit(page, user.email);

  const context = await browser.newContext();
  const signedIn = await context.newPage();
  await signIn(signedIn, user, { password });
  await expect(
    signedIn.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  await context.close();
});

test("your own page saves your name and keeps your Back Office Role", async ({
  page,
}) => {
  const admin = FIXTURE.USER.BACK_OFFICE.ADMIN;
  await signInAsAdmin(page);
  await page.goto(await userPathOf(page, admin.email));
  await expect(
    editForm(page, admin.email).getByText(
      t.edit.ownRoleLocked.replace("{app}", APP_ENTRY[App.BACK_OFFICE].name)
    )
  ).toBeVisible();
  // The same name: the Fixture stays as other tests know it.
  await saveEdit(page, admin.email);
  await expect(emailOf(page, admin.email)).toBeVisible();
});

test("an unknown id shows the 404 inside the frame", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(userHref("missing-id"));
  await expect(
    page.getByRole("heading", {
      name: SHARED_TRANSLATIONS.en.Common.NotFound.title,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
});

/** The list searched for one email, so no page hides them. */
const searchFor = (page: Page, email: string) =>
  page.goto(
    `${USERS}?${new URLSearchParams({
      [USER.PARAM.SEARCH]: USER_SEARCH.serialize({ text: email }),
    })}`
  );

/** Adds a User through the form, as a Back Office Admin, and waits for the list. */
const addedUser = async (page: Page, project: string) => {
  const user = addedBy(project);
  await page.goto(newUserHref());
  await addUser(page, user);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  return user;
};

/** Deletes a User from the list in a second tab, as another Admin would. */
const deleteInAnotherTab = async (page: Page, email: string) => {
  const other = await page.context().newPage();
  await other.goto(USERS);
  await checkboxOf(other, email).click();
  await other
    .getByRole("button", { exact: true, name: t.delete.action })
    .click();
  await other
    .getByRole("alertdialog")
    .getByRole("button", { name: t.delete.confirm })
    .click();
  await expect(other.getByText("1 User deleted")).toBeVisible();
  await other.close();
};

test("an empty Add a User says what each field needs and adds nobody", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  await addForm(page).getByRole("button", { name: t.add.submit }).click();
  await expect(page.getByText(t.add.field.emailRequired)).toBeVisible();
  await expect(page.getByText(t.add.field.nameRequired)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${newUserHref()}$`));
});

test("mismatched passwords say so and add nobody", async ({ page }, info) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  const user = addedBy(`${info.project.name}-mismatched`);
  const form = addForm(page);
  await form.getByLabel(t.add.email, { exact: true }).fill(user.email);
  await form.getByLabel(t.add.name, { exact: true }).fill(user.name);
  await form.getByLabel(t.add.password, { exact: true }).fill(user.password);
  await form
    .getByLabel(t.add.confirmPassword, { exact: true })
    .fill(`${user.password}x`);
  await form.getByRole("button", { name: t.add.submit }).click();
  await expect(page.getByText(t.add.field.passwordMismatch)).toBeVisible();
  await searchFor(page, user.email);
  await expect(
    page.getByText(t.empty.description).filter({ visible: true })
  ).toBeVisible();
});

test("a file that is not a picture is refused in the picture field", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(newUserHref());
  await picturePicker(page).setInputFiles({
    buffer: Buffer.from("not a picture"),
    mimeType: "image/jpeg",
    name: "photo.jpg",
  });
  await expect(page.getByText(t.add.avatar.unreadable)).toBeVisible();
});

test("a User deleted by another Admin before Save: the form says so and keeps what was typed", async ({
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, `${info.project.name}-gone`);
  await page.goto(await userPathOf(page, user.email));
  await deleteInAnotherTab(page, user.email);
  const form = editForm(page, user.email);
  await form.getByLabel(t.add.name, { exact: true }).fill("Too late");
  await form.getByRole("button", { name: t.edit.submit }).click();
  await expect(form.getByText(t.edit.error.gone)).toBeVisible();
  await expect(form.getByLabel(t.add.name, { exact: true })).toHaveValue(
    "Too late"
  );
});

test("an empty name or mismatched passwords say so and save nothing", async ({
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, `${info.project.name}-unsaved`);
  await page.goto(await userPathOf(page, user.email));
  const form = editForm(page, user.email);
  const save = form.getByRole("button", { name: t.edit.submit });
  await form.getByLabel(t.add.name, { exact: true }).fill("");
  await save.click();
  await expect(form.getByText(t.add.field.nameRequired)).toBeVisible();
  await form.getByLabel(t.add.name, { exact: true }).fill("Changed");
  await form
    .getByLabel(t.edit.password, { exact: true })
    .fill("A-newer-e2e-password-2");
  await form
    .getByLabel(t.edit.confirmPassword, { exact: true })
    .fill("A-different-password-3");
  await save.click();
  await expect(form.getByText(t.add.field.passwordMismatch)).toBeVisible();
  await searchFor(page, user.email);
  await expect(emailOf(page, user.email)).toBeVisible();
  await expect(rowOf(page, user.email).first()).not.toContainText("Changed");
});

test("deleting a User another Admin already deleted says so", async ({
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, `${info.project.name}-deleted-twice`);
  await page.reload();
  await checkboxOf(page, user.email).click();
  await page
    .getByRole("button", { exact: true, name: t.delete.action })
    .click();
  await deleteInAnotherTab(page, user.email);
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: t.delete.confirm })
    .click();
  await expect(
    page.getByText("This User had already been deleted")
  ).toBeVisible();
  await expect(emailOf(page, user.email)).toHaveCount(0);
});

test("an Admin whose Session a new password ended can no longer save, and is told to sign in again", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const admin = await addedUser(page, `${info.project.name}-ended`);
  // Two Sessions of the same Admin: this one keeps a page open...
  const stale = await (await browser.newContext()).newPage();
  await signIn(stale, admin, { password: admin.password });
  await expect(
    stale.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  await stale.goto(await userPathOf(stale, admin.email));
  // ...while the other sets the Admin a new password, ending it.
  const fresh = await (await browser.newContext()).newPage();
  await signIn(fresh, admin, { password: admin.password });
  await expect(
    fresh.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  await fresh.goto(await userPathOf(fresh, admin.email));
  const password = "A-newer-e2e-password-2";
  const own = editForm(fresh, admin.email);
  await own.getByLabel(t.edit.password, { exact: true }).fill(password);
  await own.getByLabel(t.edit.confirmPassword, { exact: true }).fill(password);
  await saveEdit(fresh, admin.email);

  const form = editForm(stale, admin.email);
  await form.getByLabel(t.add.name, { exact: true }).fill("Stale");
  await form.getByRole("button", { name: t.edit.submit }).click();
  await expect(form.getByText(t.edit.error.refused)).toBeVisible();
  await stale.context().close();
  await fresh.context().close();
});
