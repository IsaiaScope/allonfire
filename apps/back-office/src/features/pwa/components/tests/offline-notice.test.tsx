// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import { OfflineNotice } from "../offline-notice";

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Offline;

const render = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={I18N.DEFAULT_LANGUAGE}
      messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
    >
      <OfflineNotice />
    </NextIntlClientProvider>
  );

describe("OfflineNotice", () => {
  it("says there is no connection, with 圏外 brushed across the wall", () => {
    const html = render();
    expect(html).toContain(TEXT.title);
    expect(html).toContain(TEXT.description);
    expect(html).toContain(`>${PWA_SIGNAGE.OFFLINE.WALL_KANJI}<`);
  });

  it("offers a retry of the address that failed", () => {
    expect(render()).toContain(TEXT.retry);
  });
});
