import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { expect, test } from "@playwright/test";
import { SECTION } from "../src/features/navigation/constants/sections";
import { enT } from "../src/shared/tests/translators";
import {
  menuOf,
  openSidebar,
  SIGN_IN_URL,
  signInAsAdmin,
  signInAsUser,
} from "./pages";

/**
 * Upload is the one Section above Laura's floor: the proxy, the page, the
 * frame and (Phase 5) the API all read the same Role.
 */
const { UPLOAD } = SECTION;
const UPLOAD_LABEL = enT(`Navigation.${UPLOAD.label}`);
// Home is `/`; the locale middleware can answer it as `/en`.
const HOME_URL = new RegExp(`^${LOCAL.URL.LAURA_E2E}/(en)?${AUTH.PAGE.HOME}$`);
const UPLOAD_URL = new RegExp(`${UPLOAD.path}$`);

test("a signed-out visit to Upload is sent to Sign in before any page", async ({
  request,
}) => {
  const response = await request.get(`/it${UPLOAD.path}`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
  expect(response.headers()[HTTP.HEADER.LOCATION]).toMatch(SIGN_IN_URL);
});

test("a User is sent Home from Upload and never sees its row", async ({
  page,
}) => {
  await signInAsUser(page);
  // The proxy answers before any page runs.
  const response = await page.request.get(UPLOAD.path, { maxRedirects: 0 });
  expect(response.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
  // And the browser lands Home.
  await page.goto(UPLOAD.path);
  await expect(page).toHaveURL(HOME_URL);
  // The frame draws no Upload row for a User.
  await openSidebar(page);
  await expect(
    menuOf(page).getByRole("link", { name: UPLOAD_LABEL })
  ).toHaveCount(0);
});

test("an Admin reaches Upload and sees its row", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(UPLOAD.path);
  await expect(page).toHaveURL(UPLOAD_URL);
  await expect(page.getByRole("heading", { name: UPLOAD_LABEL })).toBeVisible();
  await openSidebar(page);
  const row = menuOf(page).getByRole("link", { name: UPLOAD_LABEL });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-current", "page");
});
