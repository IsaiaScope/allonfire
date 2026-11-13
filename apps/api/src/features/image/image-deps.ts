import {
  createImages,
  deleteImages,
  getImage,
  listImagesPage,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type { ImageDeps } from "@allonfire/storage/features/image/hono/utils/deps";
import {
  copyImageObject,
  deleteImageObjects,
  putImageObject,
} from "@allonfire/storage/features/image/objects/utils/image-objects";
import { prepareImage } from "@allonfire/storage/features/image/prepare/prepare-image";
import { forgetBuckets } from "../storage-usage/buckets";

/** The Image module on the real stack: Prisma, sharp and MinIO. */
export const imageDeps = (log: ImageDeps["log"]): ImageDeps => ({
  changed: forgetBuckets,
  copyObject: copyImageObject,
  createImages,
  deleteImages,
  deleteObjects: deleteImageObjects,
  getImage,
  listImagesPage,
  log,
  prepare: prepareImage,
  putObject: putImageObject,
  removeImagesFromApp,
  updateImages,
});
