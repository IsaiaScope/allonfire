import type { ImageLoader } from "next/image";

/** One signed link per width, as the API answers a stored picture. */
export type SignedSrcSet = readonly { width: number; url: string }[];

/**
 * A next/image loader over a stored Image's signed links: for each width
 * next/image asks, the smallest link at least that wide, else the largest.
 * The image server resized each already, so the App's optimizer never runs.
 */
export const srcSetLoader =
  (srcSet: SignedSrcSet): ImageLoader =>
  ({ width }) => {
    const fitting = srcSet
      .filter((link) => link.width >= width)
      .reduce<SignedSrcSet[number] | undefined>(
        (best, link) => (best && best.width <= link.width ? best : link),
        undefined
      );
    const largest = srcSet.reduce<SignedSrcSet[number] | undefined>(
      (best, link) => (best && best.width >= link.width ? best : link),
      undefined
    );
    return (fitting ?? largest)?.url ?? "";
  };
