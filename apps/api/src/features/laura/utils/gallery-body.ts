import { ImageAccess } from "@allonfire/database/enums";
import type { GalleryRecord } from "@allonfire/database/features/apps/laura/gallery.service";
import {
  pictureSrcSet,
  privateLinkExpiry,
} from "@allonfire/storage/features/image-server/sign";
import type { GalleryItemBody } from "../constants/schemas";

/** A record as the API answers it at `now`: a private picture's links end within the hour. */
export const toGalleryItem = (
  { access, alt, blurDataUrl, favorite, height, id, key, width }: GalleryRecord,
  now: Date
): GalleryItemBody => ({
  alt,
  blurDataUrl,
  favorite,
  height,
  id,
  srcSet: pictureSrcSet(
    key,
    access === ImageAccess.PRIVATE ? privateLinkExpiry(now) : undefined
  ),
  width,
});
