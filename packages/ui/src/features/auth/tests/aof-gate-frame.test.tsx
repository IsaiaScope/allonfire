// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFGateFrame } from "../components/aof-gate-frame";

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const t = createTranslator({
  locale: "en",
  messages: SHARED_TRANSLATIONS.en,
  namespace: "Common.Auth.Gate",
});

const frame = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={aofMessages("en", {})}>
      <AOFGateFrame
        header={<p>THE HEADER</p>}
        languageLinkClassName={{ current: "is-current", idle: "is-idle" }}
        page={AUTH.PAGE.SIGN_IN}
        wall={<i>THE WALL</i>}
      >
        <p>THE CARD</p>
      </AOFGateFrame>
    </NextIntlClientProvider>
  );

describe("AOFGateFrame", () => {
  it("draws the header, the card and the wall behind them", () => {
    const html = frame();
    expect(html).toContain("THE HEADER");
    expect(html).toContain("THE CARD");
    expect(html).toContain("THE WALL");
    expect(html.indexOf("THE WALL")).toBeLessThan(html.indexOf("THE HEADER"));
    expect(html.indexOf("THE HEADER")).toBeLessThan(html.indexOf("THE CARD"));
  });

  it("labels the language navigation and the theme switch in the shared words", () => {
    const html = frame();
    expect(html).toContain(`aria-label="${t("language")}"`);
    expect(html).toContain(`aria-label="${t("theme")}"`);
  });

  it("links the page in each language and nothing else: no registration", () => {
    const html = frame();
    expect(html.match(/<a /g)).toHaveLength(I18N.BASE_LANGUAGES.length);
    expect(html).toContain(`href="/it${AUTH.PAGE.SIGN_IN}"`);
  });

  it("draws without a header or a wall", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={aofMessages("en", {})}>
        <AOFGateFrame
          languageLinkClassName={{ current: "is-current", idle: "is-idle" }}
          page={AUTH.PAGE.SIGN_IN}
        >
          <p>THE CARD</p>
        </AOFGateFrame>
      </NextIntlClientProvider>
    );
    expect(html).toContain("THE CARD");
  });
});
