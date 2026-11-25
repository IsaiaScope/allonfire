// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { AOFEmailVerifiedNote } from "../components/aof-email-verified-note";
import { STUB_DRESSING, STUB_MESSAGES } from "./stub-dressing";

const t = SHARED_TRANSLATIONS.en.Common.Auth.EmailVerified;

/** The address the page was opened at: the landing marks a worked link, Better Auth adds `error` when it failed. */
const query = vi.hoisted(() => ({ search: "" }));
const replace = vi.hoisted(() => vi.fn());
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  async () => {
    const { Link } = await import("../../../shared/tests/navigation-mock");
    return { aofBaseNavigation: { Link, useRouter: () => ({ replace }) } };
  }
);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(query.search),
}));

const open = (search: string = AUTH.MAIL.PARAM.VERIFIED) => {
  query.search = search;
  return render(
    <NextIntlClientProvider locale="en" messages={STUB_MESSAGES}>
      <AOFEmailVerifiedNote actions={STUB_DRESSING.actions} />
    </NextIntlClientProvider>
  );
};

it("says the email is verified and leads back to Sign in, in the Design's dress", async () => {
  const screen = await open();
  await expect
    .element(screen.getByRole("link", { name: t.signIn }))
    .toHaveTextContent(STUB_DRESSING.actions.marks.enter);
  await expect.element(screen.getByText(t.verified)).toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: t.signIn }))
    .toHaveAttribute("href", AUTH.PAGE.SIGN_IN);
});

it("says the link no longer works when Better Auth sent an error, still leading back", async () => {
  const screen = await open(`${AUTH.MAIL.PARAM.ERROR}=invalid_token`);
  await expect.element(screen.getByText(t.failed)).toBeVisible();
  expect(screen.getByText(t.verified).query()).toBeNull();
  await expect
    .element(screen.getByRole("link", { name: t.signIn }))
    .toBeVisible();
});

it("leaves a direct visit for Sign in, claiming nothing was verified", async () => {
  replace.mockClear();
  const screen = await open("");
  await vi.waitFor(() =>
    expect(replace).toHaveBeenCalledWith(AUTH.PAGE.SIGN_IN)
  );
  expect(screen.getByText(t.verified).query()).toBeNull();
  expect(screen.getByText(t.failed).query()).toBeNull();
});
