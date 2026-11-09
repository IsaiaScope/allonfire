// @module-tag integration
import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import { SIGN_IN } from "../../constants/sign-in";
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
  it("sets the kanji for enter behind the submit's label, on its ground, out of the pointer's way", async () => {
    const screen = await renderForm();
    const submit = screen.getByRole("button", { name: t.submit }).element();
    const kanji = screen
      .getByText(SIGN_IN.ENTER_KANJI, { exact: true })
      .element();
    expect(submit.contains(kanji)).toBe(true);
    const { pointerEvents, position, zIndex } = getComputedStyle(kanji);
    expect({ pointerEvents, position }).toEqual({
      pointerEvents: "none",
      // Out of the label's flow: the label keeps its place.
      position: "absolute",
    });
    // Under the label, yet over the button's ground: the button is its own
    // stacking context.
    expect(Number(zIndex)).toBeLessThan(0);
    expect(getComputedStyle(submit).isolation).toBe("isolate");
  });

  it("names each empty field without calling the action", async () => {
    const screen = await renderForm();
    await screen.getByRole("button", { name: t.submit }).click();
    await expect.element(screen.getByText(t.field.emailRequired)).toBeVisible();
    await expect
      .element(screen.getByText(t.field.passwordRequired))
      .toBeVisible();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("says a link was sent, never as a failure, when the email is not verified", async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: AUTH.SIGN_IN_ERROR.UNVERIFIED,
    });
    const screen = await renderForm();
    const form = screen.getByRole("form", { name: t.submit });
    const heightBefore = form.element().getBoundingClientRect().height;
    await fill(screen, FIXTURE.USER.BACK_OFFICE.ADMIN.email, FIXTURE.PASSWORD);
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(t.note.unverified);
    await expect.element(screen.getByRole("alert")).toHaveTextContent("");
    // It takes the place kept for a failure, so the form never grows.
    expect(form.element().getBoundingClientRect().height).toBe(heightBefore);
  });

  it("posts where a verification link should land, and links to Forgot password", async () => {
    vi.mocked(signIn).mockResolvedValue({ error: AUTH.SIGN_IN_ERROR.INVALID });
    const landing = "https://back-office.test/en/email-verified";
    const screen = await render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInForm callbackURL={landing} />
      </NextIntlClientProvider>
    );
    await expect
      .element(screen.getByRole("link", { name: t.forgot }))
      .toHaveAttribute(
        "href",
        expect.stringContaining(AUTH.PAGE.FORGOT_PASSWORD)
      );
    await fill(screen, FIXTURE.USER.BACK_OFFICE.ADMIN.email, FIXTURE.PASSWORD);
    await expect
      .poll(() => vi.mocked(signIn).mock.calls.length)
      .toBeGreaterThan(0);
    const posted = vi.mocked(signIn).mock.calls.at(-1)?.[2];
    expect(posted?.get("callbackURL")).toBe(landing);
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
