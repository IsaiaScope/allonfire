// @module-tag integration
import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import { SignInForm } from "../sign-in-form";

const t = en.SignIn;

// The action runs on the Next server, which browser tests do not start;
// e2e covers the real round trip.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignInForm />
    </NextIntlClientProvider>
  );

const fill = async (
  screen: Awaited<ReturnType<typeof renderForm>>,
  email: string,
  password: string
) => {
  await screen.getByLabelText(t.email).fill(email);
  await screen.getByLabelText(t.password, { exact: true }).fill(password);
  await screen.getByRole("button", { name: t.submit }).click();
};

describe("SignInForm", () => {
  it("names each empty field without calling the action", async () => {
    const screen = await renderForm();
    await screen.getByRole("button", { name: t.submit }).click();
    await expect.element(screen.getByText(t.field.emailRequired)).toBeVisible();
    await expect
      .element(screen.getByText(t.field.passwordRequired))
      .toBeVisible();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows the action's refusal as an alert", async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: AUTH.SIGN_IN_ERROR.FORBIDDEN,
    });
    const screen = await renderForm();
    await fill(screen, FIXTURE.USER.BACK_OFFICE.USER.email, FIXTURE.PASSWORD);
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(t.error.forbidden);
  });

  it("marks both fields wrong when the credentials are", async () => {
    vi.mocked(signIn).mockResolvedValue({ error: AUTH.SIGN_IN_ERROR.INVALID });
    const screen = await renderForm();
    await fill(screen, FIXTURE.USER.BACK_OFFICE.ADMIN.email, "wrong-password");
    await expect
      .element(screen.getByLabelText(t.email))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByLabelText(t.password, { exact: true }))
      .toHaveAttribute("aria-invalid", "true");
  });

  it("says it is signing in while the action runs", async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => undefined));
    const screen = await renderForm();
    await fill(screen, FIXTURE.USER.BACK_OFFICE.ADMIN.email, FIXTURE.PASSWORD);
    await expect
      .element(screen.getByRole("button", { name: t.submitting }))
      .toBeVisible();
  });
});
