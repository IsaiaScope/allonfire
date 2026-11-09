// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { AOFToaster } from "@allonfire/ui/features/feedback/components/aof-toaster";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import { nextFrames, toastWouldHaveArrived } from "@/shared/tests/toast-timing";
import { OfflineBanner } from "../offline-banner";

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Offline;

/** Sonner sends a dismissal a frame later: let the last test's land. */
afterEach(nextFrames);

const banner = () => (
  <NextIntlClientProvider
    locale={I18N.DEFAULT_LANGUAGE}
    messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
  >
    <AOFToaster />
    <OfflineBanner />
  </NextIntlClientProvider>
);

describe("Offline banner", () => {
  it("toasts the lost connection, with 圏外 on the board, and leaves when it is back", async () => {
    offline.value = true;
    const screen = await render(banner());
    await expect.element(screen.getByText(TEXT.banner.title)).toBeVisible();
    await expect
      .element(screen.getByText(PWA_SIGNAGE.OFFLINE.WALL_KANJI))
      .toBeInTheDocument();
    offline.value = false;
    screen.rerender(banner());
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
    screen.unmount();
  });

  it("toasts nothing while online", async () => {
    offline.value = false;
    const screen = await render(banner());
    // An absence holds at once: wait until a toast would have come.
    await toastWouldHaveArrived();
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
    screen.unmount();
  });
});
