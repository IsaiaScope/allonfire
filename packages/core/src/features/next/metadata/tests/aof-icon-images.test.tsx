// @module-tag unit

import { objectValues } from "../../../../shared/utils/object";
import { HTTP } from "../../../http/constants/http";
import { METADATA } from "../../../metadata/constants/metadata";
import {
  AOFIconImage,
  AOFManifestIconRoute,
  AOFManifestIcons,
} from "../aof-icon-images";
import { pngSize } from "./png-size";

const ICONS = objectValues(METADATA.ICON.MANIFEST);
const GROUND = "#123456";

describe("AOFManifestIcons", () => {
  it("lists every manifest icon where the route serves it", () => {
    expect(AOFManifestIcons()).toEqual(
      ICONS.map(({ edge, file, purpose }) => ({
        purpose,
        sizes: `${edge}x${edge}`,
        src: `${METADATA.PATH.MANIFEST_ICON}/${file}`,
        type: HTTP.CONTENT_TYPE.PNG,
      }))
    );
  });
});

describe("AOFManifestIconRoute", () => {
  const render = vi.fn(async () => new Response("png"));
  const route = AOFManifestIconRoute(render);

  it("builds every listed icon", async () => {
    expect(await route.generateStaticParams()).toEqual(
      ICONS.map(({ file }) => ({ icon: file }))
    );
  });

  it("renders a listed icon and answers Not Found for any other", async () => {
    const first = METADATA.ICON.MANIFEST.LARGE;
    const request = new Request("https://example.test");
    await route.GET(request, { params: Promise.resolve({ icon: first.file }) });
    expect(render).toHaveBeenCalledWith(first);
    const missing = await route.GET(request, {
      params: Promise.resolve({ icon: "unlisted.png" }),
    });
    expect(missing.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});

describe("AOFIconImage", () => {
  it("draws the mark at its inset, on an opaque square the icon's size", async () => {
    const mark = vi.fn((markEdge: number) => (
      <div style={{ height: markEdge, width: markEdge }} />
    ));
    const { edge, inset } = METADATA.ICON.APPLE;
    const response = AOFIconImage({ edge, inset }, { ground: GROUND, mark });
    expect(mark).toHaveBeenCalledWith(edge * inset);
    expect(response.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      HTTP.CONTENT_TYPE.PNG
    );
    expect(await pngSize(response)).toEqual({ height: edge, width: edge });
  });
});
