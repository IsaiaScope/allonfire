import type { ImageProps } from "next/image";

/**
 * Under this side next/image warns against any placeholder: it costs more
 * than it shows, and the tile's own fallback (an initial) stands in.
 */
const MIN_SIDE = 40;

const isDataImage = (url: string): url is `data:image/${string}` =>
  url.startsWith("data:image/");

/**
 * The placeholder for a picture next/image is told is `side` px square (a
 * tile, `width={side}`), from a stored picture's blur: the blur as it is,
 * opaque and softly scaled up by the browser, from 40 px; none under.
 *
 * Never `placeholder="blur"` here: next/image blurs the data URL with a fixed
 * 20px Gaussian counted in the size it is told, so on a 42px tile the blur
 * turns see-through (centre 104/255 alpha, corner 29/255, measured) and what
 * lies under it shows. A picture told its real size (`AOFStorageImage`, 2560px
 * wide) stays opaque at any size it is shown, and keeps `placeholder="blur"`.
 */
export const tileBlur = (
  blurDataUrl: string | null | undefined,
  side: number
): Pick<ImageProps, "placeholder"> =>
  blurDataUrl && isDataImage(blurDataUrl) && side >= MIN_SIDE
    ? { placeholder: blurDataUrl }
    : {};
