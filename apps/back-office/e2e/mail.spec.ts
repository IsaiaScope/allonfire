import { SERVICES as SERVICES_API } from "@allonfire/api/features/services/constants/services";
import { API } from "@allonfire/api/shared/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { E2E } from "@allonfire/config/tests/e2e/run";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { type Browser, expect, type Page, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../src/features/i18n/translations/it.json" with {
  type: "json",
};
import { addedUser } from "./add-user";
import { linkIn, mailArrives, mailTo } from "./mail-box";
import { SERVICES, SIGN_IN_URL, signIn, signInAsAdmin } from "./pages";

// Every email these flows send goes through the API to the run's fake
// provider (`mail-sink.ts`), and a spec reads it from there, so the whole
// path is real: the page, the API, Better Auth, the driver, the email, its
// link and the page the link lands on. Each flow has a User of its own (the
// Add form makes one), so the address is the spec's alone.

const BRAND = "AllOnFire Back Office";
/**
 * A flow adds a User, signs them in and reads an email: with four projects
 * on one API, the iPhone's takes longer than Playwright's 30 s default.
 */
const FLOW_TIMEOUT_MS = 90_000;
/**
 * How WebKit words a fetch the page cancelled by leaving it (a prefetch
 * under the next `goto`): an error "due to access control checks" in the
 * console, a "Load failed" thrown. Navigation, not a failure of the page.
 */
const CANCELLED_BY_NAVIGATION = ["due to access control checks", "Load failed"];

test.describe.configure({ timeout: FLOW_TIMEOUT_MS });
const TODAY_RING = /^Today: \d+ of/;
const NON_DIGITS = /\D+/;

/**
 * What the page said in the console as errors, or threw: a flow that works
 * for the visitor but breaks in the page still fails its spec.
 */
const watchConsole = (page: Page) => {
  const errors: string[] = [];
  const keep = (text: string) => {
    if (!CANCELLED_BY_NAVIGATION.some((noise) => text.includes(noise))) {
      errors.push(text);
    }
  };
  page.on("console", (message) => {
    if (message.type() === "error") {
      keep(message.text());
    }
  });
  page.on("pageerror", (error) => keep(error.message));
  return errors;
};

/** A visitor in a browser of their own, signed out, and the console errors of their page. */
const visitorOf = async (browser: Browser) => {
  const page = await (await browser.newContext()).newPage();
  return { errors: watchConsole(page), page };
};

/** Asks for a reset link for `email` on the Forgot password page of `locale`. */
const askForLink = async (page: Page, email: string, locale?: "it") => {
  const t = (locale === "it" ? IT : EN).ForgotPassword;
  await page.goto(`${locale ? `/${locale}` : ""}${AUTH.PAGE.FORGOT_PASSWORD}`);
  await page.getByLabel(t.email).fill(email);
  await page.getByRole("button", { name: t.submit }).click();
  await expect(page.getByRole("status")).toHaveText(t.note.sent);
};

/** Opens a reset link and submits `password` as the new one. */
const chooseNewPassword = async (
  page: Page,
  link: string,
  password: string
) => {
  const reset = EN.ResetPassword;
  await page.goto(link);
  await page.getByLabel(reset.password, { exact: true }).fill(password);
  await page.getByLabel(reset.confirmPassword, { exact: true }).fill(password);
  await page.getByRole("button", { name: reset.submit }).click();
};

test("a reset email carries a link that sets a new password: the old one stops working", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, { label: "reset" });
  const { errors, page: visitor } = await visitorOf(browser);

  await askForLink(visitor, user.email);
  const [mail] = await mailArrives(user.email);
  expect(mail?.from).toBe(FIXTURE.MAIL_PROVIDER.fromAddress);
  expect(mail?.subject).toContain(BRAND);

  await chooseNewPassword(
    visitor,
    linkIn(mail as NonNullable<typeof mail>),
    FIXTURE.NEW_PASSWORD
  );
  await expect(visitor).toHaveURL(SIGN_IN_URL);

  await signIn(visitor, user, { password: user.password });
  await expect(visitor.getByText(EN.SignIn.error.invalid)).toBeVisible();
  await signIn(visitor, user, { password: FIXTURE.NEW_PASSWORD });
  await expect(
    visitor.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("a reset link works once", async ({ browser, page }, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, { label: "once" });
  const { errors, page: visitor } = await visitorOf(browser);
  await askForLink(visitor, user.email);
  const [mail] = await mailArrives(user.email);
  const link = linkIn(mail as NonNullable<typeof mail>);

  await chooseNewPassword(visitor, link, FIXTURE.NEW_PASSWORD);
  // The first reset ends on Sign in; only then is the link used again.
  await expect(visitor).toHaveURL(SIGN_IN_URL);
  await chooseNewPassword(visitor, link, "Another-e2e-password-3");
  await expect(
    visitor.getByRole("link", { name: EN.ResetPassword.askAgain })
  ).toBeVisible();
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("an address no User has gets the same answer and no email", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, { label: "known" });
  const nobody = `nobody-${info.project.name}-${Date.now()}@e2e.test`;
  const { errors, page: visitor } = await visitorOf(browser);
  await askForLink(visitor, nobody);
  await askForLink(visitor, user.email);
  await mailArrives(user.email);
  expect(await mailTo(nobody)).toEqual([]);
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("the reset email speaks the language of the page that asked", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, { label: "italian" });
  const { errors, page: visitor } = await visitorOf(browser);
  await askForLink(visitor, user.email, "it");
  const [mail] = await mailArrives(user.email);
  expect(mail?.html).toContain(`lang="${I18N.LOCALE.IT_IT}"`);
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("a User who must verify gets a link at sign in, and signs in after opening it", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, {
    label: "verify",
    mustVerify: true,
  });
  const { errors, page: visitor } = await visitorOf(browser);

  // A wrong password reveals nothing and sends nothing.
  await signIn(visitor, user, { password: "Not-the-password-9" });
  await expect(visitor.getByText(EN.SignIn.error.invalid)).toBeVisible();
  expect(await mailTo(user.email)).toEqual([]);

  await signIn(visitor, user, { password: user.password });
  await expect(visitor.getByText(EN.SignIn.note.unverified)).toBeVisible();
  const [mail] = await mailArrives(user.email);
  expect(mail?.subject).toContain(BRAND);

  await visitor.goto(linkIn(mail as NonNullable<typeof mail>));
  await expect(visitor.getByText(EN.EmailVerified.verified)).toBeVisible();
  await signIn(visitor, user, { password: user.password });
  await expect(
    visitor.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("an address gets five emails in an hour, whichever page asks, and no sixth", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const user = await addedUser(page, info.project.name, { label: "limit" });
  const { errors, page: visitor } = await visitorOf(browser);
  const MAX = 5;
  // One after another, each answered the same: the limit shows only in the inbox.
  await Array.from({ length: MAX + 1 }).reduce<Promise<void>>(
    (previous) => previous.then(() => askForLink(visitor, user.email)),
    Promise.resolve()
  );
  await mailArrives(user.email, MAX);
  // Emails leave after the answer: give a sixth the time it would need.
  await visitor.waitForTimeout(1500);
  expect(await mailTo(user.email)).toHaveLength(MAX);
  expect(errors).toEqual([]);
  await visitor.context().close();
});

test("an Admin's Test button sends a check email to their own address and the rings move", async ({
  browser,
  page,
}, info) => {
  await signInAsAdmin(page);
  const admin = await addedUser(page, info.project.name, { label: "test" });
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  const errors = watchConsole(adminPage);
  await signIn(adminPage, admin, { password: admin.password });
  await expect(
    adminPage.getByRole("button", { name: EN.Navigation.toggleMenu })
  ).toBeVisible();
  await adminPage.goto(SERVICES);

  const today = adminPage.getByLabel(TODAY_RING).first();
  const used = async () =>
    Number(
      ((await today.getAttribute("aria-label")) ?? "").split(NON_DIGITS)[1]
    );
  const before = await used();

  await adminPage
    .getByRole("button", { name: EN.Services.test.button })
    .first()
    .click();
  await expect(adminPage.getByText(EN.Services.test.accepted)).toBeVisible();
  const [mail] = await mailArrives(admin.email);
  expect(mail?.from).toBe(FIXTURE.MAIL_PROVIDER.fromAddress);
  // Other specs send too: the ring is at least one higher, without a reload.
  await expect.poll(used).toBeGreaterThan(before);
  expect(errors).toEqual([]);
  await context.close();
});

test.describe("keep-alive", () => {
  const url = `${LOCAL.URL.API_E2E}${API.PATH.SERVICES}${SERVICES_API.PATH.KEEP_ALIVE}`;

  test("refuses a call without the workflow's token", async ({ request }) => {
    expect((await request.post(url)).status()).toBe(HTTP.STATUS.UNAUTHORIZED);
    const wrong = await request.post(url, {
      headers: { [HTTP.HEADER.AUTHORIZATION]: "Bearer not-the-token" },
    });
    expect(wrong.status()).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  test("with the token, answers for the enabled provider: it sent, or it had sent lately", async ({
    request,
  }) => {
    const answer = await request.post(url, {
      headers: {
        [HTTP.HEADER.AUTHORIZATION]: `Bearer ${E2E.KEEP_ALIVE.TOKEN}`,
      },
    });
    expect(answer.status()).toBe(HTTP.STATUS.OK);
    const report = await answer.json();
    const [service] = report.services;
    expect(service.providers).toHaveLength(1);
    // Other specs send through the same provider, so it is rarely idle.
    expect([
      SERVICES_API.KEEP_ALIVE_RESULT.SENT,
      SERVICES_API.KEEP_ALIVE_RESULT.SKIPPED,
    ]).toContain(service.providers[0].result);
    if (service.providers[0].result === SERVICES_API.KEEP_ALIVE_RESULT.SENT) {
      await expect
        .poll(async () => (await mailTo(E2E.KEEP_ALIVE.RECIPIENT)).length)
        .toBeGreaterThan(0);
    }
  });
});
