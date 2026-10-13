import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};
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
    page.getByRole("heading", { name: EN.SignIn.app })
  ).toBeVisible();
  expect(errors).toEqual([]);
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

test("loads the sign-in photo from the run's bucket", async ({ page }) => {
  // next/image asks `/_next/image?url=/storage/images/<key>`; the key is in
  // the URL either way.
  const photo = page.waitForResponse((res) =>
    res.url().includes(FIXTURE.IMAGE.SIGN_IN.key)
  );
  await page.goto(AUTH.PAGE.SIGN_IN);
  expect((await photo).status()).toBe(200);
});
