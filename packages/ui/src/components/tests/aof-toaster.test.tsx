// @module-tag unit
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFToaster } from "../aof-toaster";

const render = (locale: "en" | "it") =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={SHARED_TRANSLATIONS[locale]}
    >
      <AOFToaster />
    </NextIntlClientProvider>
  );

describe("AOFToaster", () => {
  it("names the region toasts are announced in, in the page's language", () => {
    expect(render("en")).toContain('aria-label="Notifications');
    expect(render("it")).toContain('aria-label="Notifiche');
  });
});
