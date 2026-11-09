// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { ServicesSkeleton } from "../services-skeleton";

const RINGS = /data-skeleton="ring"/g;

const html = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
      <ServicesSkeleton title={<h1>Mail</h1>} />
    </NextIntlClientProvider>
  );

describe("ServicesSkeleton", () => {
  it("shows the page's title at once and says the Service is loading", () => {
    const markup = html();
    expect(markup).toContain("<h1>Mail</h1>");
    expect(markup).toContain('role="status"');
    expect(markup).toContain(EN.Services.loading);
  });

  it("keeps the two rings' places, one for today and one for the month", () => {
    expect(html().match(RINGS)).toHaveLength(2);
  });
});
