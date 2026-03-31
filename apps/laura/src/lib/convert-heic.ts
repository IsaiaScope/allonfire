const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXT_RE = /\.(heic|heif)$/i;

export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!HEIC_TYPES.has(file.type)) {
    return file;
  }

  const name = file.name.replace(HEIC_EXT_RE, ".jpg");

  try {
    // Native browser decode (Safari has built-in HEIC support)
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.92,
    });
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Fallback for browsers without native HEIC support (Chrome, Firefox)
    const heic2any = (await import("heic2any")).default;
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const result = Array.isArray(blob) ? blob[0] : blob;
    if (!result) {
      throw new Error("HEIC conversion produced no output");
    }
    return new File([result], name, { type: "image/jpeg" });
  }
}
