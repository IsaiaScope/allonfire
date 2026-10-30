import { readFile } from "node:fs/promises";
import { JAPAN_IMAGE_FONT } from "./image-font";

/** A face as `ImageResponse` takes it. */
type ImageFont = {
  data: ArrayBuffer;
  name: string;
  style: "normal";
  weight: 400 | 700;
};

/** The file's bytes in their own buffer: a Node Buffer can be a view into a shared pool. */
const bytes = async (url: URL) => {
  const file = await readFile(url);
  const copy = new ArrayBuffer(file.byteLength);
  new Uint8Array(copy).set(file);
  return copy;
};

/**
 * The Japan Design's text face for `ImageResponse`. Each `new URL` is written
 * out so the bundler traces the file. Reads the files on every call: the App
 * caches it (Next's Cache Components rejects an uncached read).
 */
export const loadJapanImageFonts = async (): Promise<ImageFont[]> => {
  const [regular, bold] = await Promise.all([
    bytes(
      new URL("./fonts/atkinson-hyperlegible-next-400.ttf", import.meta.url)
    ),
    bytes(
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
