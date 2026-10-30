// @module-tag unit
import { HTTP } from "../../../http/constants/http";
import {
  type ColorScheme,
  type LaunchOrientation,
  METADATA,
} from "../../../metadata/constants/metadata";
import { AOFLaunchScreenRoute } from "../aof-launch-screen-route";
import {
  AOFLaunchScreenLinks,
  launchScreenFile,
  launchScreenVariants,
} from "../launch-screens";
import { pngSize } from "./png-size";

const DEVICE = { height: 844, ratio: 3, width: 390 } as const;
const VARIANTS_PER_DEVICE = 4;
const variantOf = (orientation: LaunchOrientation, scheme: ColorScheme) =>
  launchScreenVariants([DEVICE]).find(
    (v) => v.orientation === orientation && v.scheme === scheme
  );
const { LANDSCAPE, PORTRAIT } = METADATA.LAUNCH.ORIENTATION;
const { DARK, LIGHT } = METADATA.COLOR_SCHEME;
const PORTRAIT_LIGHT = variantOf(PORTRAIT, LIGHT);
const PORTRAIT_DARK = variantOf(PORTRAIT, DARK);
const LANDSCAPE_LIGHT = variantOf(LANDSCAPE, LIGHT);
const LANDSCAPE_DARK = variantOf(LANDSCAPE, DARK);
const mark = vi.fn((edge: number) => (
  <div style={{ height: edge, width: edge }} />
));
const image = vi.fn(async (_scheme: ColorScheme) => ({
  ground: "#123456",
  mark,
}));

describe("launch screens", () => {
  it("lists each device size once", () => {
    const keys = METADATA.LAUNCH.DEVICES.map(
      ({ height, ratio, width }) => `${width}x${height}@${ratio}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every device a portrait and a landscape screen in each scheme", () => {
    expect(launchScreenVariants([DEVICE])).toHaveLength(VARIANTS_PER_DEVICE);
    expect(PORTRAIT_LIGHT).toMatchObject({
      orientation: METADATA.LAUNCH.ORIENTATION.PORTRAIT,
      pixelHeight: DEVICE.height * DEVICE.ratio,
      pixelWidth: DEVICE.width * DEVICE.ratio,
      scheme: METADATA.COLOR_SCHEME.LIGHT,
    });
    expect(PORTRAIT_DARK?.scheme).toBe(METADATA.COLOR_SCHEME.DARK);
    expect(LANDSCAPE_LIGHT).toMatchObject({
      orientation: METADATA.LAUNCH.ORIENTATION.LANDSCAPE,
      pixelHeight: DEVICE.width * DEVICE.ratio,
      pixelWidth: DEVICE.height * DEVICE.ratio,
    });
    expect(
      new Set(launchScreenVariants([DEVICE]).map(launchScreenFile)).size
    ).toBe(VARIANTS_PER_DEVICE);
  });

  it("keeps device-width the portrait width in landscape, as iOS reports it", () => {
    if (!LANDSCAPE_DARK) {
      throw new Error("no landscape dark variant");
    }
    const link = AOFLaunchScreenLinks().find(({ url }) =>
      url.endsWith(launchScreenFile(LANDSCAPE_DARK))
    );
    expect(link).toEqual({
      media: `(device-width: ${DEVICE.width}px) and (device-height: ${DEVICE.height}px) and (-webkit-device-pixel-ratio: ${DEVICE.ratio}) and (orientation: ${METADATA.LAUNCH.ORIENTATION.LANDSCAPE}) and (prefers-color-scheme: ${METADATA.COLOR_SCHEME.DARK})`,
      url: `${METADATA.PATH.LAUNCH_SCREEN}/${launchScreenFile(LANDSCAPE_DARK)}`,
    });
  });

  it("builds every linked screen at build time", async () => {
    const route = AOFLaunchScreenRoute(image);
    const files = (await route.generateStaticParams()).map(
      ({ screen }) => `${METADATA.PATH.LAUNCH_SCREEN}/${screen}`
    );
    expect(files).toEqual(AOFLaunchScreenLinks().map(({ url }) => url));
    expect(files).toHaveLength(
      METADATA.LAUNCH.DEVICES.length * VARIANTS_PER_DEVICE
    );
  });

  it("draws the scheme's mark at its share of the shortest edge, the screen's size", async () => {
    // The smallest screen: the PNG is really drawn.
    const [variant] = [...launchScreenVariants()].sort(
      (a, b) => a.pixelWidth * a.pixelHeight - b.pixelWidth * b.pixelHeight
    );
    if (!variant) {
      throw new Error("no launch screen");
    }
    const response = await AOFLaunchScreenRoute(image).GET(
      new Request("https://example.test"),
      { params: Promise.resolve({ screen: launchScreenFile(variant) }) }
    );
    expect(image).toHaveBeenCalledWith(variant.scheme);
    expect(mark).toHaveBeenCalledWith(
      Math.min(variant.pixelWidth, variant.pixelHeight) *
        METADATA.LAUNCH.MARK_SHARE
    );
    expect(await pngSize(response)).toEqual({
      height: variant.pixelHeight,
      width: variant.pixelWidth,
    });
  });

  it("answers Not Found for a screen it does not list", async () => {
    const route = AOFLaunchScreenRoute(image);
    const response = await route.GET(new Request("https://example.test"), {
      params: Promise.resolve({ screen: "unlisted.png" }),
    });
    expect(response.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
