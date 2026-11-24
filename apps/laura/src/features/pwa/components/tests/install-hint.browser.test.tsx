// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { firstLoad } from "@allonfire/core/features/next/pwa/utils/install-hint-state";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { toastAndCardHeights } from "@allonfire/ui/shared/tests/toast-card";
import { nextFrames } from "@allonfire/ui/shared/tests/toast-timing";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { InstallHint } from "../install-hint";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Install;
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

// A visitor back for a second visit, never dismissed.
beforeEach(() => {
  localStorage.clear();
  firstLoad();
});

afterEach(async () => {
  window.dispatchEvent(new Event("appinstalled"));
  await nextFrames();
});

describe("InstallHint", () => {
  it("shows the iPhone's steps in a card, dismissible", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: IPHONE_SAFARI,
    });
    const screen = await renderInApp({ children: <InstallHint /> });
    await expect
      .element(screen.getByRole("button", { name: TEXT.dismiss }))
      .toBeVisible();
    await expect.element(screen.getByRole("listitem").first()).toBeVisible();
    screen.unmount();
  });

  // Sonner wraps a custom toast's card in its title element: a line clamp on
  // that element cut the card short in WebKit (iOS Safari), its steps lost.
  it("shows the whole card on a phone, its steps included", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: IPHONE_SAFARI,
    });
    const screen = await renderInApp({ children: <InstallHint /> });
    await expect.element(screen.getByRole("complementary")).toBeVisible();
    await nextFrames();
    const { card, toast } = toastAndCardHeights();
    expect(toast).toBeGreaterThanOrEqual(card);
    screen.unmount();
  });
});
