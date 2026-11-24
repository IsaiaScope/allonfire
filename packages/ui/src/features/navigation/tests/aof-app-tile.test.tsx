// @module-tag unit
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAppTile } from "../components/aof-app-tile";

const LOGO = {
  banner: ["#111111", "#222222", "#333333"],
  fontFamily: "Test Face",
  name: "Test",
} as const satisfies AppLogo;

const SIDE = 48;
const OVERSCAN = 1.1;

describe("AOFAppTile", () => {
  it("draws a logo mark 1.1 times the tile, so the lettering keeps room to the edge", () => {
    const html = renderToStaticMarkup(
      <AOFAppTile entry={{ mark: { logo: LOGO }, name: "Test" }} size="lg" />
    );
    expect(html).toContain("scale-110");
    expect(html).toContain(`width="${Math.ceil(SIDE * OVERSCAN)}"`);
  });
});
