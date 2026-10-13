import {
  createImages,
  deleteImages,
  getImage,
  listImages,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type { ImageDeps } from "@allonfire/storage/features/image/hono/utils/deps";
import {
  deleteImageObjects,
  putImageObject,
} from "@allonfire/storage/features/image/objects/image-objects";
import { prepareImage } from "@allonfire/storage/features/image/prepare/prepare-image";

/** The Image module on the real stack: Prisma, sharp and MinIO. */
export const imageDeps = (log: ImageDeps["log"]): ImageDeps => ({
  createImages,
  deleteImages,
  deleteObjects: deleteImageObjects,
  getImage,
  listImages,
  log,
  prepare: prepareImage,
  putObject: putImageObject,
  removeImagesFromApp,
  updateImages,
});
