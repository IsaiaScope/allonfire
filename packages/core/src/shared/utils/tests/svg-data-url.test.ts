// @module-tag unit
import { svgDataUrl } from "../svg-data-url";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#e04a32"/></svg>';

describe("svgDataUrl", () => {
  it("wraps the SVG as a base64 data URL any image renderer loads", () => {
    const [kind, data = ""] = svgDataUrl(SVG).split(",");
    expect(kind).toBe("data:image/svg+xml;base64");
    expect(Buffer.from(data, "base64").toString()).toBe(SVG);
  });
});
