// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { languageLinks } from "../../../shared/tests/navigation-mock";
import { AOFLanguageSwitch } from "../components/aof-language-switch";

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const LABEL = "Language";
const LINK_CLASS = { current: "is-current", idle: "is-idle" } as const;
const ANCHOR = /<a [^>]*>/g;

const links = (locale: string) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <AOFLanguageSwitch
        href={AUTH.PAGE.SIGN_IN}
        label={LABEL}
        linkClassName={LINK_CLASS}
      />
    </NextIntlClientProvider>
  );

describe("AOFLanguageSwitch", () => {
  it("is a navigation named by its label", () => {
    expect(links("en")).toContain(`<nav aria-label="${LABEL}"`);
  });

  it("holds one link per base language, to the same page in that language", () => {
    const anchors = links("en").match(ANCHOR) ?? [];
    const expected = languageLinks(AUTH.PAGE.SIGN_IN, "en");
    expect(anchors).toHaveLength(I18N.BASE_LANGUAGES.length);
    for (const { attributes } of expected) {
      expect(
        anchors.filter((a) => a.includes(`href="${attributes.href}"`))
      ).toHaveLength(1);
    }
  });

  it("marks only the current language, and gives it the current class", () => {
    const anchors = links("it").match(ANCHOR) ?? [];
    const current = anchors.filter((a) => a.includes('aria-current="true"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('lang="it"');
    expect(current[0]).toContain(LINK_CLASS.current);
    for (const other of anchors.filter((a) => !a.includes("aria-current"))) {
      expect(other).toContain(LINK_CLASS.idle);
      expect(other).not.toContain(LINK_CLASS.current);
    }
  });

  it("writes each language's code as the link's text", () => {
    const html = links("en");
    for (const language of I18N.BASE_LANGUAGES) {
      expect(html).toContain(`>${language.toUpperCase()}</a>`);
    }
  });
});
