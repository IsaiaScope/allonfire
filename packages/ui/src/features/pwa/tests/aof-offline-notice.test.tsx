// @module-tag unit
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { STUB_ACTIONS, StubFrame } from "../../feedback/tests/notice-stub";
import { AOFOfflineNotice } from "../components/aof-offline-notice";
import { AOFReloadButton } from "../components/aof-reload-button";

const TEXT = SHARED_TRANSLATIONS.en.Common.Offline;

describe("AOFOfflineNotice", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={SHARED_TRANSLATIONS.en}
      timeZone="UTC"
    >
      <AOFOfflineNotice actions={STUB_ACTIONS} Frame={StubFrame} />
    </NextIntlClientProvider>
  );

  it("is an offline notice with the shared words and a dressed retry", () => {
    expect(html).toContain('data-kind="offline"');
    expect(html).toContain(`<h1>${TEXT.title}</h1>`);
    expect(html).toContain("DRESSED");
    expect(html).toContain("<i>RETRY</i>");
    expect(html).toContain(TEXT.retry);
  });
});

describe("AOFReloadButton", () => {
  it("reloads the address that failed, once per click", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    AOFReloadButton({}).props.onClick();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
