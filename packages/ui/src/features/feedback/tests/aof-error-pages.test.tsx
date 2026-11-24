// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { aofErrorPages } from "../utils/aof-error-pages";
import { STUB_ACTIONS, StubFrame } from "./notice-stub";

const { GlobalError, RouteError } = aofErrorPages({
  actions: STUB_ACTIONS,
  Frame: StubFrame,
});
const words = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Error;
const noop = () => undefined;

describe("aofErrorPages", () => {
  it("draws the route error through the page's own translations", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
      >
        <RouteError error={new Error("boom")} retry={noop} />
      </NextIntlClientProvider>
    );
    expect(html).toContain('data-kind="error"');
    expect(html).toContain(words.title);
  });

  it("draws the global error as a whole document in the default language", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} retry={noop} />
    );
    expect(html).toContain(`<html lang="${I18N.DEFAULT_LANGUAGE}"`);
    expect(html).toContain("<body");
    expect(html).toContain(words.title);
  });

  it("shows the digest as a reference in both", () => {
    const error = Object.assign(new Error("boom"), { digest: "ref-9" });
    expect(
      renderToStaticMarkup(<GlobalError error={error} retry={noop} />)
    ).toContain("ref-9");
  });
});
