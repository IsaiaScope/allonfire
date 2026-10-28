// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import itMessages from "../../../i18n/translations/it.json" with {
  type: "json",
};
import { SIGN_IN } from "../../constants/sign-in";
import { SignIn } from "../sign-in";
import { SignInForm } from "../sign-in-form";

// next/image needs Next's loader; its alt and src are all the markup reads.
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span data-alt={alt} data-src={src} />
  ),
}));
// The server action reaches the API; the markup only needs a function.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));

// The logo rides in the HTML as a data URL: no request, no wait.
const HEADING =
  /<h1[^>]*><span data-alt="Back Office" data-src="data:image\/svg\+xml/;
const BOARD_SIGN_IN = /aria-live="polite"[^>]*>Sign in</;
const CURRENT_LANGUAGE = new RegExp(
  `<a aria-current="true"[^>]*href="/en${AUTH.PAGE.SIGN_IN}"`
);
const EMAIL_LABEL = /<label[^>]*for="sign-in-email"[^>]*>Email</;
const EMAIL_AUTOCOMPLETE = /<input[^>]*autoComplete="username"/;
const PASSWORD_AUTOCOMPLETE = /<input[^>]*autoComplete="current-password"/;
const EMPTY_ALERT = /role="alert"[^>]*><\/div>/;
const ERROR_ALERT = /role="alert"[^>]*>.*Email or password is wrong\./;
const INVALID_FIELD = /aria-invalid="true"/g;

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>
  );

describe("SignIn", () => {
  it("heads the card with the App and says Sign in on the board", () => {
    const html = render(<SignIn />);
    expect(html).toMatch(HEADING);
    expect(html).toMatch(BOARD_SIGN_IN);
  });

  it("stands at the ticket gate: no photograph, its name brushed behind", () => {
    const html = render(<SignIn />);
    expect(html).toContain("font-brush");
  });

  it("sets the kanji for enter behind the submit, hidden from assistive tech", () => {
    const html = render(<SignInForm />);
    expect(html).toContain(
      `<span aria-hidden="true" class="pointer-events-none absolute`
    );
    expect(html).toContain(`lang="ja">${SIGN_IN.ENTER_KANJI}<`);
  });

  it("links to the page in each language, marking the current one", () => {
    const html = render(<SignIn />);
    expect(html).toContain('aria-label="Language"');
    expect(html).toMatch(CURRENT_LANGUAGE);
    expect(html).toContain(`href="/it${AUTH.PAGE.SIGN_IN}"`);
    expect(html).toContain('aria-label="Switch theme"');
  });

  it("states who can sign in on the departure board", () => {
    expect(render(<SignIn />)).toContain(
      '<span class="sr-only">Authorized users only. Sign-up is closed.</span>'
    );
  });
});

describe("SignInForm", () => {
  it("asks for email and password", () => {
    const html = render(<SignInForm />);
    expect(html).toMatch(EMAIL_LABEL);
    expect(html).toMatch(EMAIL_AUTOCOMPLETE);
    expect(html).toMatch(PASSWORD_AUTOCOMPLETE);
    expect(html).toContain('type="submit"');
    // The line stays, empty, so a refusal moves nothing.
    expect(html).toMatch(EMPTY_ALERT);
  });

  it("shows an error as an alert and marks both fields", () => {
    const html = render(
      <SignInForm initialState={{ error: AUTH.SIGN_IN_ERROR.INVALID }} />
    );
    expect(html).toMatch(ERROR_ALERT);
    expect(html.match(INVALID_FIELD)).toHaveLength(2);
  });

  it("leaves the fields alone when the API, not the visitor, failed", () => {
    const html = render(
      <SignInForm initialState={{ error: AUTH.SIGN_IN_ERROR.UNAVAILABLE }} />
    );
    expect(html).toContain('role="alert"');
    expect(html).not.toMatch(INVALID_FIELD);
  });

  it("names each field, so a post before hydration sends both", () => {
    const html = render(<SignInForm />);
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('id="sign-in-password"');
  });

  it("marks both fields on a refusal although the browser found nothing wrong", () => {
    const html = render(
      <SignInForm initialState={{ error: AUTH.SIGN_IN_ERROR.MISSING }} />
    );
    expect(html.match(INVALID_FIELD)).toHaveLength(2);
  });

  it("leaves the checks to the server", () => {
    expect(render(<SignInForm />)).toContain("noValidate");
  });

  it.each(objectValues(AUTH.SIGN_IN_ERROR))(
    "has a translation for %s",
    (error) => {
      expect(en.SignIn.error).toHaveProperty(error);
    }
  );

  it.each(["emailInvalid", "emailRequired", "passwordRequired"])(
    "has a field translation for %s in English and Italian",
    (key) => {
      expect(en.SignIn.field).toHaveProperty(key);
      expect(itMessages.SignIn.field).toHaveProperty(key);
    }
  );
});
