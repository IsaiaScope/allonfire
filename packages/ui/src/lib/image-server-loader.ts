import type { SignedLink } from "@allonfire/storage/features/image/constants/schemas";
import type { ImageLoader } from "next/image";

/** One signed link per width, as the API answers a stored picture. */
export type SignedSrcSet = readonly SignedLink[];

/**
 * A next/image loader over a stored Image's signed links: for each width
 * next/image asks, the smallest link at least that wide, else the largest.
 * The image server resized each already, so the App's optimizer never runs.
 */
export const srcSetLoader =
  (srcSet: SignedSrcSet): ImageLoader =>
  ({ width }) => {
    const narrowestFirst = [...srcSet].sort((a, b) => a.width - b.width);
    return (
      (
        narrowestFirst.find((link) => link.width >= width) ??
        narrowestFirst.at(-1)
      )?.url ?? ""
    );
  };
