// @module-tag unit
import { requestPasswordReset } from "@allonfire/auth/features/next/actions/password-reset";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import EmailVerifiedPage from "../[locale]/email-verified/page";
import ForgotPasswordPage from "../[locale]/forgot-password/page";
import ResetPasswordPage from "../[locale]/reset-password/page";
import SignInPage from "../[locale]/sign-in/page";

vi.mock("next/image", async () => ({
  default: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));
// The env is read at import and a unit test lacks it.
vi.mock("@/environment/environment", () => ({
  env: { LAURA_URL: LOCAL.URL.LAURA },
}));
// The server actions reach the API; the markup only needs a function, and the
// reset one is bound to the page the link lands on, which is read below.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));
vi.mock("@allonfire/auth/features/next/actions/password-reset", () => ({
  requestPasswordReset: Object.assign(vi.fn(), {
    bind: vi.fn(() => vi.fn()),
  }),
  resetPassword: vi.fn(),
}));

const COMMON = SHARED_TRANSLATIONS;
const HREF = /href="([^"]*)"/g;

const render = (node: ReactNode, locale: "en" | "it" = I18N.DEFAULT_LANGUAGE) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={aofMessages(locale, locale === "en" ? EN : IT)}
    >
      {node}
    </NextIntlClientProvider>
  );

describe("Laura's signed-out pages", () => {
  it("Sign in says Sign in and offers the way to a new password", () => {
    const html = render(<SignInPage />);
    expect(html).toContain(COMMON.en.Common.Auth.SignIn.submit);
    expect(html).toContain(`href="${AUTH.PAGE.FORGOT_PASSWORD}"`);
  });

  it("Sign in links no registration page: Laura registers nobody", () => {
    // Read here, so a future change to the setting fails this test first.
    expect(ACCESS.APP_SETTINGS[App.LAURA].registration).toBeNull();
    const hrefs = [...render(<SignInPage />).matchAll(HREF)].map(
      ([, href]) => href
    );
    const known = [
      ...I18N.BASE_LANGUAGES.map(
        (language) => `/${language}${AUTH.PAGE.SIGN_IN}`
      ),
      AUTH.PAGE.FORGOT_PASSWORD,
      `/${I18N.DEFAULT_LANGUAGE}${AUTH.PAGE.FORGOT_PASSWORD}`,
    ];
    expect(hrefs.filter((href) => !known.includes(href ?? ""))).toEqual([]);
  });

  it("Forgot password asks for an email, and the link lands on Laura's Reset page", () => {
    const html = render(<ForgotPasswordPage />);
    expect(html).toContain(COMMON.en.Common.Auth.ForgotPassword.title);
    expect(requestPasswordReset.bind).toHaveBeenCalledWith(
      null,
      I18N.DEFAULT_LANGUAGE,
      `${LOCAL.URL.LAURA}/${I18N.DEFAULT_LANGUAGE}${AUTH.PAGE.RESET_PASSWORD}`
    );
  });

  it("Reset password says Choose a new password", () => {
    expect(render(<ResetPasswordPage />)).toContain(
      COMMON.en.Common.Auth.ResetPassword.title
    );
  });

  it("Email verified says Email verification", () => {
    expect(render(<EmailVerifiedPage />)).toContain(
      COMMON.en.Common.Auth.EmailVerified.title
    );
  });

  it("reads Italian in Italian", () => {
    const html = render(<SignInPage />, "it");
    expect(html).toContain(COMMON.it.Common.Auth.SignIn.submit);
    expect(html).not.toContain(COMMON.en.Common.Auth.SignIn.submit);
  });
});
