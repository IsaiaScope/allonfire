// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import Loading from "../loading";

describe("Loading", () => {
  // A screen reader holds back what changes inside an aria-busy region, so
  // the status would never be announced.
  it("announces its status outside any busy region", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
      >
        <Loading />
      </NextIntlClientProvider>
    );
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("aria-busy");
  });
});
