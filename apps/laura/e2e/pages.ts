import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { aofAppPages } from "@allonfire/ui/features/app/tests/e2e/app-pages";
import type { Page } from "@playwright/test";

const pages = aofAppPages();

export const { openSidebar, SIGN_IN_URL } = pages;

/** Signs in as Laura's User and waits for the frame. */
export const signInAsUser = (page: Page) =>
  pages.signInAndWait(page, FIXTURE.USER.LAURA.USER);

/** Signs in as Laura's Admin and waits for the frame. */
export const signInAsAdmin = (page: Page) =>
  pages.signInAndWait(page, FIXTURE.USER.LAURA.ADMIN);

/** The menu on screen: the sidebar, or the drawer on a phone. */
export const menuOf = (page: Page) =>
  page
    .getByRole("navigation", {
      name: SHARED_TRANSLATIONS.en.Common.Navigation.menu,
    })
    .filter({ visible: true });
