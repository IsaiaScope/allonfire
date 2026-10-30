/** A crop in the picture's own pixels, as the Cropper reports it. */
export type CropArea = { x: number; y: number; width: number; height: number };

/** JPEG's quality when the browser cannot encode WebP. */
const JPEG_QUALITY = 0.9;

const encode = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The crop could not be drawn")),
      type,
      quality
    )
  );

/**
 * The picture's `area` drawn on a `size` square, as the file `name`: what an
 * Avatar's field sends. WebP (`name.webp`); where the browser cannot encode
 * it (Safari answers PNG), JPEG (`name.jpg`), since a PNG of a photo can pass
 * the Server Action's 1 MB.
 */
export const cropToSquare = async (
  source: CanvasImageSource,
  area: CropArea,
  size: number,
  name: string
): Promise<File> => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")
    ?.drawImage(
      source,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      size,
      size
    );
  const webp = await encode(canvas, "image/webp");
  const blob =
    webp.type === "image/webp"
      ? webp
      : await encode(canvas, "image/jpeg", JPEG_QUALITY);
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${name}.${extension}`, { type: blob.type });
};

/**
 * Whether this browser can draw `file`, so crop it: Chrome cannot draw a
 * HEIC, which the field then refuses in words instead of a blank dialog.
 */
export const canDraw = (file: File): Promise<boolean> =>
  createImageBitmap(file).then(
    (bitmap) => {
      bitmap.close();
      return true;
    },
    () => false
  );
