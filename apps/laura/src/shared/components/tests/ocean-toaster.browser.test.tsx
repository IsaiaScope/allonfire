// @module-tag integration

import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { noticeLineClamp } from "@allonfire/ui/shared/tests/toast-card";
import { nextFrames } from "@allonfire/ui/shared/tests/toast-timing";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import { MASCOT } from "@/shared/constants/mascots";
import { OceanToaster } from "../ocean-toaster";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const LINE_CLAMP = "5";
const KINDS = ["success", "info", "warning", "error"] as const;

const KIND_KEY = {
  error: "ERROR",
  info: "INFO",
  success: "SUCCESS",
  warning: "WARNING",
} as const satisfies Record<(typeof KINDS)[number], keyof typeof MASCOT.TOAST>;

const toaster = () =>
  render(
    <NextIntlClientProvider locale="en" messages={aofMessages("en", EN)}>
      <OceanToaster />
    </NextIntlClientProvider>
  );

/** What a kind's toast lays behind its words: the octopus's picture. */
const backdrop = (kind: (typeof KINDS)[number]) =>
  document
    .querySelector(
      `[data-sonner-toast][data-type="${kind}"] [data-testid=picture]`
    )
    ?.getAttribute("data-src");

describe("OceanToaster", () => {
  it("lays a different octopus behind each kind of notice", async () => {
    const screen = await toaster();
    for (const kind of KINDS) {
      aofToast(`A ${kind} notice`, kind);
    }
    await nextFrames();
    await expect.element(screen.getByText("A error notice")).toBeVisible();
    const sources = KINDS.map(backdrop);
    for (const source of sources) {
      expect(source).toBeTruthy();
    }
    expect(new Set(sources).size).toBe(KINDS.length);
    screen.unmount();
  });

  it("lays behind each kind the picture MASCOT.TOAST gives it", async () => {
    const screen = await toaster();
    for (const kind of KINDS) {
      aofToast(`A ${kind} notice`, kind);
    }
    await nextFrames();
    await expect.element(screen.getByText("A error notice")).toBeVisible();
    for (const kind of KINDS) {
      expect(backdrop(kind)).toBe(
        svgDataUrl(OCEAN_ART[MASCOT.TOAST[KIND_KEY[kind]]].SVG)
      );
    }
    screen.unmount();
  });

  it("clamps a notice's words to five lines", async () => {
    const screen = await toaster();
    aofToast("A notice", "error");
    await nextFrames();
    await expect.element(screen.getByText("A notice")).toBeVisible();
    expect(noticeLineClamp()).toBe(LINE_CLAMP);
    screen.unmount();
  });
});
