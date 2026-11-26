import type { GalleryRecord } from "@allonfire/database/features/apps/laura/gallery.service";
import { signedSrcSet } from "@allonfire/storage/features/image-server/sign";
import type { GalleryItemBody } from "../constants/schemas";

/** A record as the API answers it at `now`: a private picture's links end within the hour. */
export const toGalleryItem = (
  record: GalleryRecord,
  now: Date
): GalleryItemBody => ({
  alt: record.alt,
  blurDataUrl: record.blurDataUrl,
  createdAt: record.createdAt.toISOString(),
  favorite: record.favorite,
  height: record.height,
  id: record.id,
  srcSet: signedSrcSet(record, now),
  width: record.width,
});
