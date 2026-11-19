// @module-tag integration
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { nextFrames } from "@allonfire/ui/shared/tests/toast-timing";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import { OceanToaster } from "@/shared/components/ocean-toaster";
import { OfflineBanner } from "../offline-banner";
import { OfflineCard } from "../offline-card";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

const TEXT = SHARED_TRANSLATIONS.en.Common.Offline;

afterEach(nextFrames);

describe("OfflineCard", () => {
  it("shows its title and description", async () => {
    const screen = await render(
      <OfflineCard description="Waiting for the sea" title="No connection" />
    );
    await expect.element(screen.getByText("No connection")).toBeVisible();
    await expect.element(screen.getByText("Waiting for the sea")).toBeVisible();
  });
});

const banner = () => (
  <NextIntlClientProvider locale="en" messages={aofMessages("en", EN)}>
    <OceanToaster />
    <OfflineBanner />
  </NextIntlClientProvider>
);

describe("OfflineBanner", () => {
  it("toasts the lost connection and leaves when it is back", async () => {
    offline.value = true;
    const screen = await render(banner());
    await expect.element(screen.getByText(TEXT.banner.title)).toBeVisible();
    offline.value = false;
    await screen.rerender(banner());
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
    screen.unmount();
  });
});
