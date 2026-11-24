// @module-tag unit
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import { enT } from "@/shared/tests/translators";
import { OfflineNotice } from "../offline-notice";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const html = renderToStaticMarkup(
  <NextIntlClientProvider
    locale="en"
    messages={aofMessages("en", EN)}
    timeZone="UTC"
  >
    <OfflineNotice />
  </NextIntlClientProvider>
);

// The retry's reload is ui's `AOFReloadButton`, tested there.
describe("OfflineNotice", () => {
  it("says there is no connection and offers a retry", () => {
    expect(html).toContain(enT("Common.Offline.title"));
    expect(html).toContain(enT("Common.Offline.description"));
    expect(html).toContain(enT("Common.Offline.retry"));
  });

  it("draws the octopus asleep: a picture with no words", () => {
    expect(html).toContain('data-alt=""');
  });
});
