import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { E2E_TAG } from "@allonfire/config/tests/e2e/run";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { expect, type Page, test } from "@playwright/test";
import APP_IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};

const { en: EN, it: IT } = SHARED_TRANSLATIONS;

const IT_SIGN_IN = `/it${AUTH.PAGE.SIGN_IN}`;
/** Refused by the API: retried once back online, a sign-in that changes nothing. */
const WRONG_PASSWORD = "wrong-password-1";
/** Playwright's WebKit fails a reload while offline with a worker active ("internal error"). */
const WORKER_OFFLINE = { tag: E2E_TAG.CHROMIUM_ONLY };

/** Loads a page and waits until the worker controls it, its precache filled. */
const withWorker = async (page: Page, path: string) => {
  await page.goto(path);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null)
    )
    .toBe(true);
};

test("serves the service worker uncached", async ({ request }) => {
  const response = await request.get(PWA.PATH.SERVICE_WORKER);
  expect(response.status()).toBe(HTTP.STATUS.OK);
  expect(response.headers()[HTTP.HEADER.CACHE_CONTROL]).toBe(
    HTTP.CACHE_CONTROL.NO_CACHE
  );
});

test(
  "shows the Offline page in the URL's language when a load fails",
  WORKER_OFFLINE,
  async ({ context, page }) => {
    await withWorker(page, IT_SIGN_IN);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: IT.Common.Offline.title })
    ).toBeVisible();
    await page.goto(AUTH.PAGE.SIGN_IN);
    await expect(
      page.getByRole("heading", { name: EN.Common.Offline.title })
    ).toBeVisible();
    await context.setOffline(false);
  }
);

test(
  "retries the address that failed once the network is back",
  WORKER_OFFLINE,
  async ({ context, page }) => {
    await withWorker(page, IT_SIGN_IN);
    await context.setOffline(true);
    await page.reload();
    await context.setOffline(false);
    await page.getByRole("button", { name: IT.Common.Offline.retry }).click();
    await expect(page).toHaveURL(new RegExp(`${IT_SIGN_IN}$`));
    await expect(
      page.getByRole("heading", { name: IT.Common.Offline.title })
    ).toHaveCount(0);
  }
);

test("reports a lost connection mid-session without leaving the page", async ({
  context,
  page,
}) => {
  // Next goes offline when one of its own requests fails; the network going
  // away tells it nothing. A sign-in sent offline is one, once hydrated (a
  // post before hydration is the browser's own).
  await page.goto(IT_SIGN_IN);
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel(APP_IT.SignIn.email)
    .fill(FIXTURE.USER.BACK_OFFICE.ADMIN.email);
  await page
    .getByLabel(APP_IT.SignIn.password, { exact: true })
    .fill(WRONG_PASSWORD);
  await context.setOffline(true);
  await page.getByRole("button", { name: APP_IT.SignIn.submit }).click();
  await expect(page.getByText(IT.Common.Offline.banner.title)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(IT.Common.Offline.banner.title)).toHaveCount(0);
});
