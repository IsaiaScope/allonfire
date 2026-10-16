// @module-tag unit
import {
  AOF_LOGO,
  type AppLogo,
  monogramDataUrl,
} from "@allonfire/design/brand/aof-logo";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFBrandLogo } from "../aof-brand-logo";

const APP = {
  banner: ["#000001", "#000002", "#000003"],
  fontFamily: "Test Face",
  name: "Test app",
} as const satisfies AppLogo;
const { horizontal: HORIZONTAL, square: SQUARE } = AOF_LOGO.LAYOUT;

describe("AOFBrandLogo", () => {
  it("draws the scheme's monogram and ground, and the App's banner", () => {
    const html = renderToStaticMarkup(
      <AOFBrandLogo
        app={APP}
        height={SQUARE.HEIGHT}
        layout="square"
        scheme="light"
      />
    );
    expect(html).toContain(monogramDataUrl("light"));
    expect(html).toContain(AOF_LOGO.SCHEME.light.ground);
    expect(html).toContain(APP.name);
    for (const color of APP.banner) {
      expect(html).toContain(color);
    }
  });

  it("keeps the horizontal layout's proportions at any height", () => {
    const height = HORIZONTAL.HEIGHT / 2;
    const html = renderToStaticMarkup(
      <AOFBrandLogo
        app={APP}
        height={height}
        layout="horizontal"
        scheme="dark"
      />
    );
    expect(html).toContain(`width:${HORIZONTAL.WIDTH / 2}px`);
  });

  it("rounds its corners only when asked, so an icon fills its square", () => {
    const square = (rounded: boolean) =>
      renderToStaticMarkup(
        <AOFBrandLogo
          app={APP}
          height={SQUARE.HEIGHT}
          layout="square"
          rounded={rounded}
          scheme="dark"
        />
      );
    expect(square(false)).not.toContain(`border-radius:${SQUARE.RADIUS}px`);
    expect(square(true)).toContain(`border-radius:${SQUARE.RADIUS}px`);
  });
});
