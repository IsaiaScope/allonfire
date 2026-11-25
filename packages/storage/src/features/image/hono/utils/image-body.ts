import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { signedSrcSet } from "../../../image-server/sign";
import type { ImageBody } from "../../constants/schemas";

/** An Image as the API answers it at `now`: its links signed for that moment. */
export const toImageBody = (image: ImageRecord, now: Date): ImageBody => ({
  access: image.access,
  alt: image.alt,
  apps: image.apps,
  blurDataUrl: image.blurDataUrl,
  bytes: image.bytes,
  createdAt: image.createdAt.toISOString(),
  height: image.height,
  id: image.id,
  key: image.key,
  srcSet: signedSrcSet(image, now),
  version: image.version,
  width: image.width,
});
