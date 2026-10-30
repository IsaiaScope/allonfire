// @module-tag unit
import { objectValues } from "../../../../shared/utils/object";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFBaseViewport } from "../aof-base-viewport";

const SCHEME_COLORS = {
  dark: { background: "#101010" },
  light: { background: "#fafafa" },
};

const viewport = AOFBaseViewport({ schemeColors: SCHEME_COLORS });

describe("AOFBaseViewport", () => {
  // Without cover iOS reports every safe-area inset as 0, so the gutters in
  // ui's base.css could not keep clear of the notch or the home indicator.
  it("draws the page edge to edge, so the safe-area insets are real", () => {
    expect(viewport.viewportFit).toBe("cover");
  });

  it("renders in both colour schemes", () => {
    expect(viewport.colorScheme).toBe(METADATA.PAGE_COLOR_SCHEME);
  });

  it("gives each scheme the App's ground as its theme colour", () => {
    expect(viewport.themeColor).toEqual(
      objectValues(METADATA.COLOR_SCHEME).map((scheme) => ({
        color: SCHEME_COLORS[scheme].background,
        media: `(prefers-color-scheme: ${scheme})`,
      }))
    );
  });
});
