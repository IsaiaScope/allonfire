/** HEIC or HEIF, by type or, when the browser gives none, by extension. */
const HEIC_TYPE = /^image\/hei[cf]$/;
const HEIC_EXTENSION = /\.hei[cf]$/i;
const JPEG = { QUALITY: 0.92, TYPE: "image/jpeg" } as const;

export const isHeic = (file: File): boolean =>
  HEIC_TYPE.test(file.type) || HEIC_EXTENSION.test(file.name);

/** `file` drawn by the browser itself, as a JPEG; throws where it cannot (Chrome, Firefox). */
const drawnAsJpeg = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ quality: JPEG.QUALITY, type: JPEG.TYPE });
};

/**
 * `file` decoded by heic-to (a current libheif), loaded only now: only Chrome
 * and Firefox need it.
 */
const decodedAsJpeg = async (file: File): Promise<Blob> => {
  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, quality: JPEG.QUALITY, type: JPEG.TYPE });
};

/**
 * An iPhone's HEIC as a JPEG every browser draws, so it crops like any other
 * picture (Laura's way): drawn by the browser where it can (Safari), else
 * decoded by heic-to. Any other file comes back as it is; one that cannot
 * be read throws.
 */
export const heicToJpeg = async (file: File): Promise<File> => {
  if (!isHeic(file)) {
    return file;
  }
  const jpeg = await drawnAsJpeg(file).catch(() => decodedAsJpeg(file));
  return new File([jpeg], file.name.replace(HEIC_EXTENSION, ".jpg"), {
    type: JPEG.TYPE,
  });
};
