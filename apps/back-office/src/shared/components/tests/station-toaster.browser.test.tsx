// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { noticeLineClamp } from "@allonfire/ui/shared/tests/toast-card";
import { nextFrames } from "@allonfire/ui/shared/tests/toast-timing";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { StationToaster } from "../station-toaster";

const LINE_CLAMP = "5";

describe("StationToaster", () => {
  // A notice stops at five lines with an ellipsis; the Install hint's card
  // (a custom toast) is never clamped (install-hint.browser.test).
  it("clamps a notice's words to five lines", async () => {
    const screen = await render(
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
      >
        <StationToaster />
      </NextIntlClientProvider>
    );
    aofToast("A notice", "error");
    await nextFrames();
    await expect.element(screen.getByText("A notice")).toBeVisible();
    expect(noticeLineClamp()).toBe(LINE_CLAMP);
    screen.unmount();
  });
});
