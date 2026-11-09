import { resolve } from "node:path";

/** The Image Fixtures' source files, one per accepted format plus a GIF. */
export const IMAGE_FIXTURE = {
  /** The folder holding them. */
  DIR: resolve(import.meta.dirname, "../files"),
  /** Each file's name, as `FIXTURE.IMAGE`'s `source` spells it. */
  FILE: {
    GIF: "animation.gif",
    HEIC: "colors-no-alpha.heic",
    PHOTO: "photo.jpg",
    PHOTO_AVIF: "photo.avif",
    PHOTO_WEBP: "photo.webp",
    PNG: "graphic.png",
  },
} as const;
