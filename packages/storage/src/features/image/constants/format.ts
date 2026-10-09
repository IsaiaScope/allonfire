/**
 * How every Image is stored: AVIF, about half the size of WebP at the same
 * look. Each object keeps the type it was written with, so Images stored
 * earlier as WebP still serve as WebP.
 */
export const IMAGE_FORMAT = {
  CONTENT_TYPE: "image/avif",
  EXTENSION: ".avif",
} as const;
