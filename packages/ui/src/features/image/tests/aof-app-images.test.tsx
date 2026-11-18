// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { aofAppImages } from "../utils/aof-app-images";

/** Every image an App sends goes through `ImageResponse`: keep what it was given. */
const sent = vi.hoisted((): { calls: unknown[][] } => ({ calls: [] }));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(...args: unknown[]) {
      sent.calls.push(args);
    }
  },
}));

const LINE = "#102030";
const FONTS = [{ data: new ArrayBuffer(0), name: "Test Face" }];
const APP = {
  banner: ["#000031", "#000032", "#000033"],
  fontFamily: "Test Face",
  name: "Test app",
} as const satisfies AppLogo;
const LOOK = {
  colors: {
    background: "#000011",
    foreground: "#000012",
    mutedForeground: "#000013",
  },
  fontFamily: "Test Face",
} as const;

const images = aofAppImages({
  description: (locale) => `Described in ${locale}`,
  fonts: async () => FONTS,
  ground: {
    icon: "#111111",
    launch: (scheme) => (scheme === "dark" ? "#222222" : "#333333"),
  },
  line: LINE,
  logo: APP,
  shareCardLook: LOOK,
});

describe("aofAppImages", () => {
  it("draws the link-preview card at its size, the App's name as the headline and its line as the band", async () => {
    sent.calls.length = 0;
    await images.shareImage({ params: Promise.resolve({ locale: "it" }) });
    const [element, options] = sent.calls[0] ?? [];
    expect(isValidElement(element)).toBe(true);
    if (!isValidElement(element)) {
      return;
    }
    const html = renderToStaticMarkup(element);
    expect(html).toContain(APP.name);
    expect(html).toContain("Described in it");
    expect(html).toContain(LINE);
    expect(options).toMatchObject({
      ...METADATA.SHARE_IMAGE.SIZE,
      fonts: FONTS,
    });
  });

  it("puts the launch screen's mark on the scheme's own ground", async () => {
    expect((await images.launchScreen("dark")).ground).toBe("#222222");
    expect((await images.launchScreen("light")).ground).toBe("#333333");
  });
});
