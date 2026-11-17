// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { nextFrames } from "@/shared/tests/toast-timing";
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
    const title = document.querySelector("[data-sonner-toast] [data-title]");
    if (!title) {
      throw new Error("The notice has no title element");
    }
    expect(getComputedStyle(title).webkitLineClamp).toBe(LINE_CLAMP);
    screen.unmount();
  });
});
