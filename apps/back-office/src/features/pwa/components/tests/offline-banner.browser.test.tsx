// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFToaster } from "@allonfire/ui/components/aof-toaster";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import { OfflineBanner } from "../offline-banner";

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Offline;

const nextFrames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

/** Sonner sends a dismissal a frame later: let the last test's land. */
afterEach(nextFrames);

/** Long enough for a toast to arrive: a frame late, then Sonner's own timer. */
const TOAST_ARRIVES_MS = 200;

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
    await nextFrames();
    await new Promise((resolve) => setTimeout(resolve, TOAST_ARRIVES_MS));
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
    screen.unmount();
  });
});
