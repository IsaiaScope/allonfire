// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSignIn } from "../components/aof-sign-in";
import { AOFSignInForm } from "../components/aof-sign-in-form";
import { STUB_DRESSING, STUB_MESSAGES } from "./stub-dressing";

// The server action reaches the API; the markup only needs a function.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const t = SHARED_TRANSLATIONS.en.Common.Auth.SignIn;
const APP = "Test App";
const forbidden = createTranslator({
  locale: "en",
  messages: STUB_MESSAGES,
  namespace: "Common.Auth.SignIn",
})("error.forbidden", { app: APP });
const EMAIL_LABEL = /<label[^>]*for="sign-in-email"[^>]*>Email</;
const EMAIL_AUTOCOMPLETE = /<input[^>]*autoComplete="username"/;
const PASSWORD_AUTOCOMPLETE = /<input[^>]*autoComplete="current-password"/;
const EMPTY_ALERT = /role="alert"[^>]*><\/div>/;
const REQUIRED_MARK = /aria-hidden="true"[^>]*>\*</;
const ARIA_REQUIRED = /<input[^>]*aria-required="true"/g;
const ERROR_ALERT = /role="alert"[^>]*>.*Email or password is wrong\./;
const INVALID_FIELD = /aria-invalid="true"/g;

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={STUB_MESSAGES}>
      {node}
    </NextIntlClientProvider>
  );

const form = (props: Partial<Parameters<typeof AOFSignInForm>[0]> = {}) =>
  render(
    <AOFSignInForm actions={STUB_DRESSING.actions} appName={APP} {...props} />
  );

describe("AOFSignIn", () => {
  it("stands in the App's frame, which is told the page and says Sign in", () => {
    const html = render(<AOFSignIn appName={APP} dressing={STUB_DRESSING} />);
    expect(html).toContain(`data-page="${AUTH.PAGE.SIGN_IN}"`);
    expect(html).toContain(`data-status="${t.submit}"`);
    expect(html).toContain('type="submit"');
  });

  it("sends the verification link's landing along when it knows the App's address", () => {
    const html = render(
      <AOFSignIn
        appName={APP}
        appUrl="https://app.test"
        dressing={STUB_DRESSING}
      />
    );
    expect(html).toContain('name="callbackURL"');
    expect(html).toContain("https://app.test/en");
  });

  it("sets the Design's mark for enter behind the submit", () => {
    expect(form()).toContain(STUB_DRESSING.actions.marks.enter);
  });
});

describe("AOFSignInForm", () => {
  it("asks for email and password", () => {
    const html = form();
    expect(html).toMatch(EMAIL_LABEL);
    expect(html).toMatch(EMAIL_AUTOCOMPLETE);
    expect(html).toMatch(PASSWORD_AUTOCOMPLETE);
    // The line stays, empty, so a refusal moves nothing.
    expect(html).toMatch(EMPTY_ALERT);
  });

  it("marks no field with an asterisk: both are needed, and the inputs say so", () => {
    const html = form();
    expect(html).not.toMatch(REQUIRED_MARK);
    expect(html.match(ARIA_REQUIRED)).toHaveLength(2);
  });

  it("shows an error as an alert and marks both fields", () => {
    const html = form({ initialState: { error: AUTH.ERROR.SIGN_IN.INVALID } });
    expect(html).toMatch(ERROR_ALERT);
    expect(html.match(INVALID_FIELD)).toHaveLength(2);
  });

  it("names the App in a refusal that is about it", () => {
    expect(
      form({ initialState: { error: AUTH.ERROR.SIGN_IN.FORBIDDEN } })
    ).toContain(forbidden);
  });

  it("leaves the fields alone when the API, not the visitor, failed", () => {
    const html = form({
      initialState: { error: AUTH.ERROR.SIGN_IN.UNAVAILABLE },
    });
    expect(html).toContain('role="alert"');
    expect(html).not.toMatch(INVALID_FIELD);
  });

  it("names each field, so a post before hydration sends both", () => {
    const html = form();
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("noValidate");
  });

  it.each(
    objectValues(AUTH.ERROR.SIGN_IN).filter(
      (error) => error !== AUTH.ERROR.SIGN_IN.UNVERIFIED
    )
  )("has an error translation for %s", (error) => {
    expect(t.error).toHaveProperty(error);
  });

  it("says unverified as a note: a link went out, nothing failed", () => {
    expect(t.note).toHaveProperty(AUTH.ERROR.SIGN_IN.UNVERIFIED);
    expect(t.error).not.toHaveProperty(AUTH.ERROR.SIGN_IN.UNVERIFIED);
  });
});
