import type {
  createImages,
  deleteImages,
  getImage,
  linksOfImages,
  listImages,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type {
  deleteImageObjects,
  putImageObject,
} from "../../objects/image-objects";
import type { prepareImage } from "../../prepare/prepare-image";

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
  /** Takes Images out of one App, deleting those left in none; returns their keys. */
  removeImagesFromApp: typeof removeImagesFromApp;
  /** Each Image's placements, to check a PATCH before writing; a delete checks inside its own write. */
  linksOf: typeof linksOfImages;
  /** Where best-effort cleanup failures go; pino's shape. */
  log: { warn: (details: object, message: string) => void };
};
