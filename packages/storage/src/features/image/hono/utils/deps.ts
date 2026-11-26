import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import type {
  createImages,
  deleteImages,
  getImage,
  listImagesPage,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type { MiddlewareHandler } from "hono";
import type { LeftoverLog } from "../../objects/utils/delete-leftovers";
import type {
  copyImageObject,
  deleteImageObjects,
  putImageObject,
  readImageObject,
} from "../../objects/utils/image-objects";
import type { prepareImage } from "../../prepare/prepare-image";

/** What the Image module needs; the host passes the real ones, tests stubs. */
export type ImageDeps = {
  prepare: typeof prepareImage;
  putObject: typeof putImageObject;
  /**
   * The host's limiter for the Export route, which runs it before anything
   * else (ADR 0036: a decode costs the server). The host owns its store, whom
   * it counts, 429 body and the `STORAGE_EXPORT_RATE_LIMIT_*` values.
   */
  limitExport: MiddlewareHandler<AuthEnv>;
  /** A stored Image's file, for its Export. */
  readObject: typeof readImageObject;
  deleteObjects: typeof deleteImageObjects;
  /** A copy under a new name: a public Image made private moves to it. */
  copyObject: typeof copyImageObject;
  createImages: typeof createImages;
  /** A numbered page, with the count and bytes of every visible Image. */
  listImagesPage: typeof listImagesPage;
  getImage: typeof getImage;
  updateImages: typeof updateImages;
  deleteImages: typeof deleteImages;
  /** Takes Images out of one App, deleting those left in none; returns their keys. */
  removeImagesFromApp: typeof removeImagesFromApp;
  /**
   * Told after a write moved what the bucket holds (an upload, a change of
   * access, a delete), so the host drops any total it kept of the bucket
   * before the answer goes out. Never throws.
   */
  changed: () => Promise<void>;
  /** Where best-effort cleanup failures go; pino's shape. */
  log: LeftoverLog;
};
