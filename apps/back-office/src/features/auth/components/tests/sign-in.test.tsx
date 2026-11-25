// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { AOFSignIn } from "@allonfire/ui/features/auth/components/aof-sign-in";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUTH_DRESSING } from "@/features/auth/components/dressing";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import { SIGN_IN } from "../../constants/sign-in";

vi.mock("next/image", async () => ({
  default: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));
// The server action reaches the API; the markup only needs a function.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));

// The logo rides in the HTML as a data URL: no request, no wait.
const HEADING =
  /<h1[^>]*><span data-alt="Back Office"[^>]*data-src="data:image\/svg\+xml/;
const BOARD_SIGN_IN = /aria-live="polite"[^>]*>Sign in</;
const CURRENT_LANGUAGE = new RegExp(
  `<a aria-current="true"[^>]*href="/en${AUTH.PAGE.SIGN_IN}"`
);
const ENTER_KANJI = new RegExp(
  `<span aria-hidden="true"[^>]*lang="ja">${SIGN_IN.KANJI.ENTER}<`
);

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={aofMessages("en", en)}>
      {node}
    </NextIntlClientProvider>
  );

const signIn = () =>
  render(<AOFSignIn appName={BACK_OFFICE.name} dressing={AUTH_DRESSING} />);

describe("Sign in at the ticket gate", () => {
  it("heads the card with the App and says Sign in on the board", () => {
    const html = signIn();
    expect(html).toMatch(HEADING);
    expect(html).toMatch(BOARD_SIGN_IN);
  });

  // How the brush paints it: BrushKanji's browser test.
  it("stands at the ticket gate: no photograph, its name brushed behind", () => {
    expect(signIn()).toContain(
      renderToStaticMarkup(<BrushKanji kanji={SIGN_IN.KANA.BOARD} />)
    );
  });

  // Where it sits in the submit: the form's browser test.
  it("sets the kanji for enter behind the submit, hidden from assistive tech", () => {
    expect(signIn()).toMatch(ENTER_KANJI);
  });

  it("links to the page in each language, marking the current one", () => {
    const html = signIn();
    expect(html).toContain('aria-label="Language"');
    expect(html).toMatch(CURRENT_LANGUAGE);
    expect(html).toContain(`href="/it${AUTH.PAGE.SIGN_IN}"`);
    expect(html).toContain('aria-label="Switch theme"');
  });

  it("states who can sign in on the departure board", () => {
    // Read once, not as it runs: the board's browser test.
    expect(signIn()).toContain(`>${en.SignIn.notice}<`);
  });
});
