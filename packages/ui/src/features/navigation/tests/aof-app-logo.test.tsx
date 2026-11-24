// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOF_LOGO, type AppLogo } from "@allonfire/design/brand/aof-logo";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAppLogo } from "../components/aof-app-logo";

const LOGO = {
  banner: ["#111111", "#222222", "#333333"],
  fontFamily: "Test Face",
  name: "Test",
} as const satisfies AppLogo;

const IMG = /<img /g;

describe("AOFAppLogo", () => {
  it("draws one picture per scheme, 64px tall, the theme's own shown", () => {
    const html = renderToStaticMarkup(<AOFAppLogo logo={LOGO} name="Test" />);
    expect(html.match(IMG)).toHaveLength(2);
    expect(html.match(/h-16/g)).toHaveLength(2);
    expect(html).toContain("hidden dark:block");
    expect(html).toContain("dark:hidden");
    expect(html).toContain('alt="Test"');
    expect(html).toContain(`height="${AOF_LOGO.LAYOUT.horizontal.HEIGHT}"`);
  });

  it("draws just the scheme it is given, always shown (a band that is always night)", () => {
    const html = renderToStaticMarkup(
      <AOFAppLogo logo={LOGO} name="Test" scheme={METADATA.LOGO.SCHEME.DARK} />
    );
    expect(html.match(IMG)).toHaveLength(1);
    expect(html).not.toContain("hidden");
    expect(html).toContain("h-16");
  });
});
