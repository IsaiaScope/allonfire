// @module-tag unit
import {
  AOF_LOGO,
  type AppLogo,
  aofLogoDataUrl,
  aofLogoSvg,
  monogramDataUrl,
} from "../aof-logo";
import { BRAND } from "../aof-monogram";

const APP = {
  banner: ["#000001", "#000002", "#000003"],
  fontFamily: "Test Face",
  name: "Test app",
} as const satisfies AppLogo;

const { dark: DARK, light: LIGHT } = AOF_LOGO.SCHEME;

describe("aofLogoSvg", () => {
  it.each([
    ["square", AOF_LOGO.LAYOUT.square],
    ["horizontal", AOF_LOGO.LAYOUT.horizontal],
  ] as const)("draws the %s logo at its own size", (layout, geometry) => {
    const svg = aofLogoSvg({ app: APP, layout, scheme: "dark" });
    expect(svg).toContain(`viewBox="0 0 ${geometry.WIDTH} ${geometry.HEIGHT}"`);
    expect(svg).toContain(`>${APP.name.toUpperCase()}<`);
    for (const color of APP.banner) {
      expect(svg).toContain(`stop-color="${color}"`);
    }
  });

  it("sets the letters and ground of the scheme asked for", () => {
    const dark = aofLogoSvg({ app: APP, layout: "square", scheme: "dark" });
    const light = aofLogoSvg({ app: APP, layout: "square", scheme: "light" });
    expect(dark).toContain(`fill="${DARK.ground}"`);
    expect(dark).toContain(`fill="${DARK.letter}"`);
    expect(light).toContain(`fill="${LIGHT.ground}"`);
    expect(light).toContain(`fill="${LIGHT.letter}"`);
    expect(light).not.toContain(BRAND.LETTER);
  });

  // On a light ground the dark scheme's shadow reads as a grey halo that
  // thickens the letters.
  it("softens the letters' shadow on the light ground", () => {
    const light = aofLogoSvg({ app: APP, layout: "square", scheme: "light" });
    const auto = aofLogoSvg({ app: APP, layout: "square", scheme: "auto" });
    expect(light).toContain(`flood-opacity="${LIGHT.shadow}"`);
    expect(light).not.toContain(`flood-opacity="${DARK.shadow}"`);
    expect(auto).toContain(`.aof-shadow{flood-opacity:${LIGHT.shadow}}`);
  });

  it("follows the viewer's theme when the scheme is auto", () => {
    const svg = aofLogoSvg({ app: APP, layout: "square", scheme: "auto" });
    expect(svg).toContain(`fill="${DARK.ground}"`);
    expect(svg).toContain("@media (prefers-color-scheme: light)");
    expect(svg).toContain(LIGHT.ground);
    expect(svg).toContain(LIGHT.letter);
  });

  it("separates the monogram from the banner only side by side", () => {
    const square = aofLogoSvg({ app: APP, layout: "square", scheme: "dark" });
    const horizontal = aofLogoSvg({
      app: APP,
      layout: "horizontal",
      scheme: "dark",
    });
    expect(square).not.toContain("aof-divider");
    expect(horizontal).toContain("aof-divider");
  });

  // Safari draws an SVG filter inside an <img> at one pixel per pixel, so on
  // a phone the shadowed letters of a small logo came out blurred.
  it("draws a flat logo without its shadow and glow, for a small size", () => {
    const shaded = aofLogoSvg({ app: APP, layout: "square", scheme: "dark" });
    const flat = aofLogoSvg({
      app: APP,
      flat: true,
      layout: "square",
      scheme: "dark",
    });
    expect(shaded).toContain('filter="url(#');
    expect(flat).not.toContain('filter="url(#');
    expect(flat).toContain(`fill="${DARK.letter}"`);
    expect(flat).toContain(`>${APP.name.toUpperCase()}<`);
  });
});

describe("monogramDataUrl", () => {
  it("is the Brand monogram itself on dark, recoloured on light", () => {
    const decode = (url: string) =>
      Buffer.from(url.split(",")[1] ?? "", "base64").toString();
    expect(decode(monogramDataUrl("dark"))).toBe(BRAND.MONOGRAM_SVG);
    expect(decode(monogramDataUrl("light"))).toContain(LIGHT.letter);
    expect(decode(monogramDataUrl("light"))).not.toContain(BRAND.LETTER);
  });
});

describe("aofLogoDataUrl", () => {
  it("is the logo's SVG, encoded without Node's Buffer so a client page can build it", () => {
    const options = { app: APP, layout: "horizontal", scheme: "dark" } as const;
    vi.stubGlobal("Buffer", undefined);
    try {
      const url = aofLogoDataUrl(options);
      expect(decodeURIComponent(url.slice(url.indexOf(",") + 1))).toBe(
        aofLogoSvg(options)
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
