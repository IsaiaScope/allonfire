import type {
  createImages,
  deleteImages,
  getImage,
  listImages,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type {
  deleteImageObjects,
  putImageObject,
} from "../../../features/image/image-objects";
import type { prepareImage } from "../../../features/image/prepare-image";

/** What the Image module needs; the host passes the real ones, tests stubs. */
export type ImageDeps = {
  prepare: typeof prepareImage;
  putObject: typeof putImageObject;
  deleteObjects: typeof deleteImageObjects;
  createImages: typeof createImages;
  listImages: typeof listImages;
  getImage: typeof getImage;
  updateImages: typeof updateImages;
  deleteImages: typeof deleteImages;
  /** Where best-effort cleanup failures go; pino's shape. */
  log: { warn: (details: object, message: string) => void };
};
