import { readFile } from "node:fs/promises";

/** A face as `ImageResponse` takes it. */
export type ImageFont = {
  data: ArrayBuffer;
  name: string;
  style: "normal";
  weight: 400 | 700;
};

/**
 * The file's bytes in their own buffer: a Node Buffer can be a view into a
 * shared pool. Every Design's image-font loader reads its files through it.
 */
export const readImageFontFile = async (url: URL): Promise<ArrayBuffer> => {
  const file = await readFile(url);
  const copy = new ArrayBuffer(file.byteLength);
  new Uint8Array(copy).set(file);
  return copy;
};
