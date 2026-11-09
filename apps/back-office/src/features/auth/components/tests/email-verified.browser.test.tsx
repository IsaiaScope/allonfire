// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import { EmailVerifiedNote } from "../email-verified-note";

const t = en.EmailVerified;

/** The address the page was opened at: the landing marks a worked link, Better Auth adds `error` when it failed. */
const query = vi.hoisted(() => ({ search: "" }));
const replace = vi.hoisted(() => vi.fn());
vi.mock("@/features/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/i18n/navigation")>()),
  useRouter: () => ({ replace }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(query.search),
}));

const open = (search: string = AUTH.MAIL.VERIFIED_PARAM) => {
  query.search = search;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EmailVerifiedNote />
    </NextIntlClientProvider>
  );
};

it("says the email is verified and leads back to Sign in", async () => {
  const screen = await open();
  await expect.element(screen.getByText(t.verified)).toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: t.signIn }))
    .toHaveAttribute("href", AUTH.PAGE.SIGN_IN);
});

it("says the link no longer works when Better Auth sent an error, still leading back", async () => {
  const screen = await open(`${AUTH.MAIL.ERROR_PARAM}=invalid_token`);
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
