// @module-tag integration
import {
  requestPasswordReset,
  resetPassword,
} from "@allonfire/auth/features/next/actions/password-reset";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { AOFForgotPasswordForm } from "../components/aof-forgot-password-form";
import { AOFResetPasswordForm } from "../components/aof-reset-password-form";
import { STUB_DRESSING, STUB_MESSAGES } from "./stub-dressing";

const {
  ForgotPassword: forgot,
  ResetPassword: reset,
  Password,
} = SHARED_TRANSLATIONS.en.Common.Auth;
const BACK = "Back to Sign in";
const { actions, back: backLink } = STUB_DRESSING;
const RESET_PAGE = "https://back-office.test/en/reset-password";

// The actions run on the Next server, which browser tests do not start.
vi.mock("@allonfire/auth/features/next/actions/password-reset", () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

/** The address the reset page was opened at: its query, the link's token. */
const query = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(query.search),
}));

const inEnglish = (children: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={STUB_MESSAGES}>
      {children}
    </NextIntlClientProvider>
  );

/** Opens the Forgot password form and asks for a link for one address. */
const askForLink = async () => {
  const screen = await inEnglish(
    <AOFForgotPasswordForm
      actions={actions}
      back={backLink}
      resetPage={RESET_PAGE}
    />
  );
  await screen.getByLabelText(forgot.email).fill("anyone@forgot.test");
  await screen.getByRole("button", { name: forgot.submit }).click();
  return screen;
};

/** Opens Reset password at a link with a token and types `password` twice. */
const typeNewPassword = async (password: string) => {
  query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
  const screen = await inEnglish(
    <AOFResetPasswordForm actions={actions} back={backLink} />
  );
  await screen.getByLabelText(reset.password, { exact: true }).fill(password);
  await screen
    .getByLabelText(reset.confirmPassword, { exact: true })
    .fill(password);
  return screen;
};

beforeEach(() => {
  vi.mocked(requestPasswordReset).mockReset().mockResolvedValue({});
  vi.mocked(resetPassword).mockReset().mockResolvedValue({});
  query.search = "";
});

describe("AOFForgotPasswordForm", () => {
  it("names an empty email without asking", async () => {
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        resetPage={RESET_PAGE}
      />
    );
    await screen.getByRole("button", { name: forgot.submit }).click();
    await expect
      .element(screen.getByText(forgot.field.emailRequired))
      .toBeVisible();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("asks for the link to land on the reset page, then says the same for any address", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ sent: true });
    const screen = await askForLink();
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(forgot.note.sent);
    expect(vi.mocked(requestPasswordReset).mock.calls[0]?.slice(0, 2)).toEqual([
      "en",
      RESET_PAGE,
    ]);
  });

  it("explains Forgot password under the gate's title", async () => {
    const forgotScreen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        resetPage={RESET_PAGE}
      />
    );
    await expect.element(forgotScreen.getByText(forgot.intro)).toBeVisible();
  });

  it("explains Reset password with a link", async () => {
    query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    await expect.element(screen.getByText(reset.intro)).toBeVisible();
  });

  it("explains the dead-link notice, above its warning", async () => {
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    await expect.element(screen.getByText(reset.expiredIntro)).toBeVisible();
  });

  it("leaves the page's title to the gate: Forgot password has no heading of its own", async () => {
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        resetPage={RESET_PAGE}
      />
    );
    expect(screen.getByRole("heading").elements()).toHaveLength(0);
  });

  it("leaves the page's title to the gate: Reset password has none, nor has the dead-link notice", async () => {
    query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    expect(screen.getByRole("heading").elements()).toHaveLength(0);
  });

  it("leaves the page's title to the gate in the dead-link notice too", async () => {
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    expect(screen.getByRole("heading").elements()).toHaveLength(0);
  });

  it("stays the same form once the link is sent: the address kept but locked, Send link off, nothing moved", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ sent: true });
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        resetPage={RESET_PAGE}
      />
    );
    const form = screen.getByRole("form", { name: forgot.title });
    const heightBefore = form.element().getBoundingClientRect().height;
    await screen.getByLabelText(forgot.email).fill("anyone@forgot.test");
    await screen.getByRole("button", { name: forgot.submit }).click();
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(forgot.note.sent);
    await expect
      .element(screen.getByLabelText(forgot.email))
      .toHaveAttribute("readonly");
    await expect
      .element(screen.getByLabelText(forgot.email))
      .toHaveValue("anyone@forgot.test");
    await expect
      .element(screen.getByRole("button", { name: forgot.submit }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("link", { name: BACK }))
      .toBeVisible();
    expect(form.element().getBoundingClientRect().height).toBe(heightBefore);
  });

  it("says when links cannot be sent now", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      error: AUTH.FORGOT_ERROR.UNAVAILABLE,
    });
    const screen = await askForLink();
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(forgot.error.unavailable);
  });
});

describe("AOFResetPasswordForm", () => {
  it("offers a new link when the address carries no token", async () => {
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(reset.error.invalidToken);
    await expect
      .element(screen.getByRole("link", { name: reset.askAgain }))
      .toHaveAttribute(
        "href",
        expect.stringContaining(AUTH.PAGE.FORGOT_PASSWORD)
      );
  });

  it("asks for a new link in the Design's dress, the way back on its left", async () => {
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    const again = screen.getByRole("link", { name: reset.askAgain });
    await expect.element(again).toHaveTextContent(actions.marks.retry);
    await expect.element(again).toBeVisible();
    const back = screen
      .getByRole("link", { name: BACK })
      .element()
      .getBoundingClientRect();
    const box = again.element().getBoundingClientRect();
    expect(back.right).toBeLessThanOrEqual(box.left);
    expect(back.top).toBeCloseTo(box.top, 0);
  });

  it("ticks the rules live and sets the password with the link's token", async () => {
    const screen = await typeNewPassword(FIXTURE.NEW_PASSWORD);
    await expect
      .element(screen.getByRole("checkbox", { name: Password.rule.match }))
      .toBeChecked();
    await screen.getByRole("button", { name: reset.submit }).click();
    await expect.poll(() => vi.mocked(resetPassword).mock.calls.length).toBe(1);
    expect(vi.mocked(resetPassword).mock.calls[0]?.slice(0, 2)).toEqual([
      "en",
      "tok-1",
    ]);
  });

  it("refuses a weak password without asking", async () => {
    const screen = await typeNewPassword("short");
    await screen.getByRole("button", { name: reset.submit }).click();
    await expect
      .element(screen.getByText(reset.field.passwordWeak))
      .toBeVisible();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("offers a new link once the API says the link no longer works", async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      error: AUTH.RESET_ERROR.INVALID_TOKEN,
    });
    const screen = await typeNewPassword(FIXTURE.NEW_PASSWORD);
    await screen.getByRole("button", { name: reset.submit }).click();
    await expect
      .element(screen.getByRole("link", { name: reset.askAgain }))
      .toBeVisible();
  });
});

describe("the way back to Sign in the Design gives", () => {
  /** Where the back link and the submit button stand, side by side in a row. */
  const boxesOf = (
    screen: Awaited<ReturnType<typeof inEnglish>>,
    submit: string
  ) => ({
    back: screen
      .getByRole("link", { name: BACK })
      .element()
      .getBoundingClientRect(),
    submit: screen
      .getByRole("button", { name: submit })
      .element()
      .getBoundingClientRect(),
  });

  it("sits left of Send link, and the row fits the form", async () => {
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        resetPage={RESET_PAGE}
      />
    );
    const link = screen.getByRole("link", { name: BACK });
    await expect
      .element(link)
      .toHaveAttribute("href", expect.stringContaining(AUTH.PAGE.SIGN_IN));
    const boxes = boxesOf(screen, forgot.submit);
    expect(boxes.back.right).toBeLessThanOrEqual(boxes.submit.left);
    // The row fits the form: the button shrinks, it never spills out.
    const form = screen.getByRole("form").element().getBoundingClientRect();
    expect(boxes.submit.right).toBeLessThanOrEqual(form.right);
  });

  it("sits left of the save button on Reset password too", async () => {
    query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
    const screen = await inEnglish(
      <AOFResetPasswordForm actions={actions} back={backLink} />
    );
    await expect
      .element(screen.getByRole("link", { name: BACK }))
      .toBeVisible();
    const boxes = boxesOf(screen, reset.submit);
    expect(boxes.back.right).toBeLessThanOrEqual(boxes.submit.left);
    expect(boxes.back.top).toBeCloseTo(boxes.submit.top, 0);
    const form = screen.getByRole("form").element().getBoundingClientRect();
    expect(boxes.submit.right).toBeLessThanOrEqual(form.right);
  });
});

describe("a state to start from", () => {
  it("shows the error the Forgot password page already knows, in the kept place", async () => {
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        initialState={{ error: AUTH.FORGOT_ERROR.RATE_LIMITED }}
        resetPage={RESET_PAGE}
      />
    );
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(forgot.error.rateLimited);
  });

  it("starts Forgot password already sent: the note on show, Send link off", async () => {
    const screen = await inEnglish(
      <AOFForgotPasswordForm
        actions={actions}
        back={backLink}
        initialState={{ sent: true }}
        resetPage={RESET_PAGE}
      />
    );
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(forgot.note.sent);
    await expect
      .element(screen.getByRole("button", { name: forgot.submit }))
      .toBeDisabled();
  });

  it("shows the error Reset password already knows above its button", async () => {
    query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
    const screen = await inEnglish(
      <AOFResetPasswordForm
        actions={actions}
        back={backLink}
        initialState={{ error: AUTH.RESET_ERROR.UNAVAILABLE }}
      />
    );
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(reset.error.unavailable);
  });

  it("starts Reset password on the dead-link page when the link is known to be dead", async () => {
    query.search = `${AUTH.MAIL.TOKEN_PARAM}=tok-1`;
    const screen = await inEnglish(
      <AOFResetPasswordForm
        actions={actions}
        back={backLink}
        initialState={{ error: AUTH.RESET_ERROR.INVALID_TOKEN }}
      />
    );
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(reset.error.invalidToken);
  });
});
