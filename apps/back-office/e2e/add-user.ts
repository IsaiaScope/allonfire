import { App, Role } from "@allonfire/database/enums";
import { expect, type Page } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { newUserHref } from "../src/features/users/utils/user-href";
import { APP_ENTRY } from "../src/shared/constants/apps";
import { enT } from "../src/shared/tests/translators";
import { USERS } from "./pages";

const t = EN.Users;

/** A User a spec adds, its email unique to the run, the project and the spec's `label`. */
export const addedBy = (project: string, label = "add") => ({
  email: `${label}-${project}-${Date.now()}@e2e.test`,
  name: "Added",
  password: "An-e2e-password-1",
});

/**
 * The Add page's form; a role query skips the hidden copy Next keeps of a
 * page it has left, which a label query would also find.
 */
export const addForm = (page: Page) =>
  page.getByRole("form", { name: t.add.title });

/** Types the User's email, name and password, `confirm` as its repeat. */
export const fillAddForm = async (
  page: Page,
  user: ReturnType<typeof addedBy>,
  confirm = user.password
) => {
  const form = addForm(page);
  await form.getByLabel(t.add.email, { exact: true }).fill(user.email);
  await form.getByLabel(t.form.name, { exact: true }).fill(user.name);
  await form.getByLabel(t.form.password, { exact: true }).fill(user.password);
  await form.getByLabel(t.form.confirmPassword, { exact: true }).fill(confirm);
};

/**
 * Fills the Add page and adds the User as a Back Office Admin; `mustVerify`
 * makes them verify their email before their first Session.
 */
export const addUser = async (
  page: Page,
  user: ReturnType<typeof addedBy>,
  { mustVerify = false }: { mustVerify?: boolean } = {}
) => {
  const form = addForm(page);
  await fillAddForm(page, user);
  await form
    .getByRole("radiogroup", {
      name: enT("Users.form.role", { app: APP_ENTRY[App.BACK_OFFICE].name }),
    })
    .getByRole("button", { name: EN.Navigation.role[Role.ADMIN] })
    .click();
  if (mustVerify) {
    await form
      .getByRole("radiogroup", { name: t.form.verification })
      .getByRole("button", { name: t.form.mustVerify })
      .click();
  }
  await form.getByRole("button", { name: t.add.submit }).click();
};

/** Adds a User through the form, as a Back Office Admin, and waits for the list. */
export const addedUser = async (
  page: Page,
  project: string,
  options: { label?: string; mustVerify?: boolean } = {}
) => {
  const user = addedBy(project, options.label);
  await page.goto(newUserHref());
  await addUser(page, user, options);
  await expect(page).toHaveURL(new RegExp(`${USERS}$`));
  return user;
};
