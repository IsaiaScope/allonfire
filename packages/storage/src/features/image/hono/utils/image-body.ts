import { ImageAccess } from "@allonfire/database/enums";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { pictureSrcSet, privateLinkExpiry } from "../../../image-server/sign";
import type { ImageBody } from "../../constants/schemas";

/** An Image as the API answers it at `now`: its links signed for that moment. */
export const toImageBody = (image: ImageRecord, now: Date): ImageBody => ({
  access: image.access,
  alt: image.alt,
  apps: image.apps,
  blurDataUrl: image.blurDataUrl,
  createdAt: image.createdAt.toISOString(),
  height: image.height,
  id: image.id,
  srcSet: pictureSrcSet(
    image.key,
    image.access === ImageAccess.PRIVATE ? privateLinkExpiry(now) : undefined
  ),
  width: image.width,
});
