// @module-tag unit
import { HTTP } from "../../../features/http/constants/http";
import { svgDataUrl } from "../svg-data-url";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#e04a32"/></svg>';

describe("svgDataUrl", () => {
  it("wraps the SVG as a URL-encoded data URL, with no Node Buffer", () => {
    const [kind, data = ""] = svgDataUrl(SVG).split(",");
    expect(kind).toBe(`data:${HTTP.CONTENT_TYPE.SVG}`);
    expect(decodeURIComponent(data)).toBe(SVG);
  });
});
