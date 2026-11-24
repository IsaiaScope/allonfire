import { type ImageFont, readImageFontFile } from "../shared/image-font-file";
import { JAPAN_IMAGE_FONT } from "./image-font";

/**
 * The Japan Design's text face for `ImageResponse`. Each `new URL` is written
 * out so the bundler traces the file. Reads the files on every call: the App
 * caches it (Next's Cache Components rejects an uncached read).
 */
export const loadJapanImageFonts = async (): Promise<ImageFont[]> => {
  const [regular, bold] = await Promise.all([
    readImageFontFile(
      new URL("./fonts/atkinson-hyperlegible-next-400.ttf", import.meta.url)
    ),
    readImageFontFile(
      new URL("./fonts/atkinson-hyperlegible-next-700.ttf", import.meta.url)
    ),
  ]);
  return [
    {
      data: regular,
      name: JAPAN_IMAGE_FONT.FAMILY,
      style: "normal",
      weight: 400,
    },
    { data: bold, name: JAPAN_IMAGE_FONT.FAMILY, style: "normal", weight: 700 },
  ];
};
