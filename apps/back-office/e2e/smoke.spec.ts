import { expect, type Page, test } from "@playwright/test";

const ROOT_URL = /\/$/;

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

test("serves English at / with the AOF button", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(ROOT_URL);
  await expect(
    page.getByRole("heading", { name: "Back office" })
  ).toBeVisible();
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("serves Italian at /it", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/it");
  await expect(page.getByText("Ancora niente qui.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Inizia" })).toBeVisible();
  expect(errors).toEqual([]);
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
