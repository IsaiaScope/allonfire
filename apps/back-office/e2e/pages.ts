import { USER } from "@allonfire/auth/features/users/constants/users";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { aofAppPages } from "@allonfire/ui/features/app/tests/e2e/app-pages";
import { sectionHref } from "@allonfire/ui/features/navigation/utils/sections";
import type { Page } from "@playwright/test";
import { SECTION } from "../src/features/navigation/constants/sections";
import { enT } from "../src/shared/tests/translators";

const pages = aofAppPages();

export const { onPhone, openSidebar, SIGN_IN_URL, signIn, tapSidebarLink } =
  pages;

/** The Users list. */
export const USERS = sectionHref(SECTION.USERS.path);

/** The Services and their providers. */
export const SERVICES = sectionHref(SECTION.SERVICES.path);

/**
 * The Users list searched for one email: the Users other tests add can push
 * anyone off the first page.
 */
export const usersSearchHref = (email: string) =>
  `${USERS}?${new URLSearchParams({
    [USER.PARAM.SEARCH]: USER.SEARCH.serialize({ text: email }),
  })}`;

/** Signs in as the Back Office Admin and waits for the frame. */
export const signInAsAdmin = (page: Page) =>
  pages.signInAndWait(page, FIXTURE.USER.BACK_OFFICE.ADMIN);

/** A User's email as drawn on screen: a table row, or a card on a phone. */
export const emailOf = (page: Page, email: string) =>
  page
    .getByRole("button", {
      name: enT("Users.copy.label", { email }),
    })
    .filter({ visible: true });

/** The row, or the card on a phone, that holds a User. */
export const rowOf = (page: Page, email: string) =>
  page
    .getByRole("row")
    .or(page.getByRole("listitem"))
    .filter({ has: emailOf(page, email) });
