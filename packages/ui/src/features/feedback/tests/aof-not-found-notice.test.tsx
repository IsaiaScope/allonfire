// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFNotFoundNotice } from "../components/aof-not-found-notice";
import { STUB_ACTIONS, StubFrame } from "./notice-stub";

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const TEXT = SHARED_TRANSLATIONS.en.Common.NotFound;

describe("AOFNotFoundNotice", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={SHARED_TRANSLATIONS.en}
      timeZone="UTC"
    >
      <AOFNotFoundNotice actions={STUB_ACTIONS} Frame={StubFrame} />
    </NextIntlClientProvider>
  );

  it("is a notFound notice with the shared title", () => {
    expect(html).toContain('data-kind="notFound"');
    expect(html).toContain(`<h1>${TEXT.title}</h1>`);
  });

  it("links back to the start, dressed with the App's back mark", () => {
    expect(html).toContain(`href="${METADATA.PATH.ROOT}"`);
    expect(html).toContain("DRESSED");
    expect(html).toContain("<i>BACK</i>");
    expect(html).toContain(TEXT.back);
  });
});
