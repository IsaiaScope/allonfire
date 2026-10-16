// @module-tag unit

import { objectValues } from "../../../../shared/utils/object";
import { HTTP } from "../../../http/constants/http";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFLogoRoute, logoFile } from "../aof-logo-route";

const svgFor = vi.fn(
  (layout: string, scheme: string) => `<svg>${layout} ${scheme}</svg>`
);
const route = AOFLogoRoute(svgFor);
const request = new Request("https://example.test");
const LAYOUTS = objectValues(METADATA.LOGO.LAYOUT);
const SCHEMES = objectValues(METADATA.LOGO.SCHEME);

describe("AOFLogoRoute", () => {
  it("builds every layout in every scheme", async () => {
    const files = (await route.generateStaticParams()).map(({ file }) => file);
    expect(files).toHaveLength(LAYOUTS.length * SCHEMES.length);
    expect(files).toContain(
      logoFile(METADATA.LOGO.LAYOUT.HORIZONTAL, METADATA.LOGO.SCHEME.AUTO)
    );
  });

  it("answers a listed file as SVG, drawn in its layout and scheme", async () => {
    const { HORIZONTAL } = METADATA.LOGO.LAYOUT;
    const { LIGHT } = METADATA.LOGO.SCHEME;
    const response = await route.GET(request, {
      params: Promise.resolve({ file: logoFile(HORIZONTAL, LIGHT) }),
    });
    expect(response.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      HTTP.CONTENT_TYPE.SVG
    );
    expect(await response.text()).toBe(`<svg>${HORIZONTAL} ${LIGHT}</svg>`);
  });

  it("answers Not Found for any other file", async () => {
    const response = await route.GET(request, {
      params: Promise.resolve({ file: "unlisted.svg" }),
    });
    expect(response.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
