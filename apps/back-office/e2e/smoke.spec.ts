import { API } from "@allonfire/api/shared/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { imageListBodySchema } from "@allonfire/storage/features/image/hono/constants/schemas";
import { expect, type Page, test } from "@playwright/test";
// Playwright loads specs as ES modules; Next ships no export map for it.
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

test("serves a stored Image through the image server, never from the bucket", async ({
  request,
}) => {
  const { alt } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
  const list = await request.get(
    `${LOCAL.URL.API_E2E}${API.PATH.IMAGES}?app=${App.BACK_OFFICE}`
  );
  const { images } = imageListBodySchema.parse(await list.json());
  const image = images.find((one) => one.alt.en === alt.en);
  const link = image?.srcSet.find(({ width }) => width === 1080)?.url ?? "";
  const served = await request.get(link, {
    headers: { [HTTP.HEADER.ACCEPT]: IMAGE.FORMAT.CONTENT_TYPE },
  });
  expect(served.status()).toBe(HTTP.STATUS.OK);
  expect(served.headers()[HTTP.HEADER.CONTENT_TYPE]).toBe(
    IMAGE.FORMAT.CONTENT_TYPE
  );
  // The link names the file it signs: the bucket answers nobody directly.
  const [, stored = ""] = link.split("/plain/s3://");
  expect((await request.get(`${LOCAL.URL.STORAGE}/${stored}`)).status()).toBe(
    HTTP.STATUS.FORBIDDEN
  );
});
