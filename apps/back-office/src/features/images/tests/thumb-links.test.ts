// @module-tag unit

import { objectValues } from "@allonfire/core/shared/utils/object";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { srcSetLoader } from "@allonfire/ui/shared/utils/image-server-loader";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import { IMAGES } from "../constants/images";

const LINKS = IMAGE_SERVER.WIDTHS.map((width) => ({
  url: String(width),
  width,
}));
const DENSITIES = [1, 2];
const [FIRST_DEVICE_WIDTH] = imageConfigDefault.deviceSizes;
const NEXT_WIDTHS = [
  ...imageConfigDefault.imageSizes,
  ...imageConfigDefault.deviceSizes,
].sort((a, b) => a - b);

/** The width next/image's srcset offers a browser that needs `pixels`: the smallest at least that wide. */
const candidateFor = (pixels: number) =>
  NEXT_WIDTHS.find((width) => width >= pixels) ?? NEXT_WIDTHS.at(-1) ?? pixels;

describe("a stored picture's tile", () => {
  // A tile whose width has no small link silently loads a 640 wide file instead.
  it.each(
    objectValues(IMAGES.THUMB_PX).flatMap((side) =>
      DENSITIES.map((density) => ({ density, side }))
    )
  )(
    "has a small link at $density x on a $side px tile",
    ({ density, side }) => {
      const link = srcSetLoader(LINKS)({
        quality: 75,
        src: "ignored",
        width: candidateFor(side * density),
      });
      expect(Number(link)).toBeLessThan(FIRST_DEVICE_WIDTH ?? 0);
    }
  );
});
