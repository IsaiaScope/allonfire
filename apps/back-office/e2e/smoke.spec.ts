import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { expect, type Page, test } from "@playwright/test";
// Playwright loads specs as ES modules; Next ships no export map for it.
import { getImageProps } from "next/image.js";
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { SIGN_IN_URL } from "./pages";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

test("sends a signed-out visitor from / to sign-in", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
  await expect(
    page.getByRole("heading", { name: BACK_OFFICE.NAME })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("redirects a signed-out visit to home before sending a page", async ({
  request,
}) => {
  const response = await request.get(METADATA.PATH.ROOT, { maxRedirects: 0 });
  expect(response.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
  expect(response.headers()[HTTP.HEADER.LOCATION]).toMatch(SIGN_IN_URL);
});

test("serves Italian at /it/sign-in", async ({ page }) => {
  await page.goto(`/it${AUTH.PAGE.SIGN_IN}`);
  await expect(
    page.getByRole("button", { name: IT.SignIn.submit })
  ).toBeVisible();
});

test("renders the localized 404 for an unknown path", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible();
  await page.goto("/it/non-esiste");
  await expect(
    page.getByRole("heading", { name: "Pagina non trovata" })
  ).toBeVisible();
});

test("serves a stored Image through the App, raw and optimized as AVIF", async ({
  request,
}) => {
  const { height, key, width } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
  const src = `${STORAGE.PATH.IMAGE_PROXY}/${key}`;
  expect((await request.get(src)).status()).toBe(HTTP.STATUS.OK);
  // The URL a page's next/image asks for: the App's optimizer, reading the
  // Image through the proxy, answering in the best format the browser takes.
  const { props } = getImageProps({ alt: "", height, src, width });
  const optimized = await request.get(props.src, {
    headers: { [HTTP.HEADER.ACCEPT]: IMAGE.FORMAT.CONTENT_TYPE },
  });
  expect(optimized.status()).toBe(HTTP.STATUS.OK);
  expect(optimized.headers()[HTTP.HEADER.CONTENT_TYPE]).toBe(
    IMAGE.FORMAT.CONTENT_TYPE
  );
});
