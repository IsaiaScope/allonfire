import { type ImageFont, readImageFontFile } from "../shared/image-font-file";
import { OCEAN_IMAGE_FONT } from "./image-font";

/**
 * The Ocean Design's text face for `ImageResponse`. Each `new URL` is written
 * out so the bundler traces the file. Reads the files on every call: the App
 * caches it (Next's Cache Components rejects an uncached read).
 */
export const loadOceanImageFonts = async (): Promise<ImageFont[]> => {
  const [regular, bold] = await Promise.all([
    readImageFontFile(new URL("./fonts/nunito-400.woff", import.meta.url)),
    readImageFontFile(new URL("./fonts/nunito-700.woff", import.meta.url)),
  ]);
  return [
    {
      data: regular,
      name: OCEAN_IMAGE_FONT.FAMILY,
      style: "normal",
      weight: 400,
    },
    { data: bold, name: OCEAN_IMAGE_FONT.FAMILY, style: "normal", weight: 700 },
  ];
};
