import { fileURLToPath } from "node:url";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { safeAreaSuite } from "@allonfire/ui/features/app/tests/e2e/safe-area-suite";
import type { Page } from "@playwright/test";
import { SECTIONS } from "../src/features/navigation/constants/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { imageLink } from "./images-flow";
import { rowOf, signInAsAdmin, usersSearchHref } from "./pages";

/** A User's page: its address is the list's link to them. */
const userPath = async (page: Page) => {
  const { email } = FIXTURE.USER.NO_MEMBERSHIP;
  await page.goto(usersSearchHref(email));
  return (
    (await rowOf(page, email).getByRole("link").getAttribute("href")) ?? ""
  );
};

/** An Image's page: its address is the list's link to a Fixture Image. */
const imagePath = async (page: Page) => {
  await page.goto(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  return (
    (await imageLink(page, FIXTURE.IMAGE.HEIC_IN_BACK_OFFICE.alt.en)
      .first()
      .getAttribute("href")) ?? ""
  );
};

safeAreaSuite({
  address: {
    // Nothing serves it: the not-found page.
    "/[...rest]": () => "/no-such-page",
    [`${BACK_OFFICE.PAGE.USERS}/[id]`]: userPath,
    [`${BACK_OFFICE.PAGE.STORAGE_IMAGES}/[id]`]: imagePath,
  },
  appDir: fileURLToPath(new URL("../src/app", import.meta.url)),
  firstSection: SECTIONS[0].path,
  signedIn: signInAsAdmin,
});
