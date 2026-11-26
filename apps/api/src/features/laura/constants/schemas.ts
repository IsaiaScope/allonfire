import { keysetCursor } from "@allonfire/core/features/search/keyset-cursor";
import {
  imageBodySchema,
  pictureBodySchema,
} from "@allonfire/storage/features/image/constants/schemas";
import { z } from "zod";
import { LAURA } from "./laura";

/**
 * An Image as Laura's screens show it, with the caller's own Favorite flag and
 * the day it was uploaded (the name of its Export, ADR 0036).
 */
const galleryItemBodySchema = pictureBodySchema
  .extend({
    createdAt: imageBodySchema.shape.createdAt,
    favorite: z.boolean(),
  })
  .meta({ ref: "GalleryItem" });
export type GalleryItemBody = z.infer<typeof galleryItemBodySchema>;

/** One page; `nextCursor` is null on the last. */
export const galleryPageBodySchema = z
  .object({
    items: z.array(galleryItemBodySchema),
    nextCursor: z.string().nullable(),
  })
  .meta({ ref: "GalleryPage" });
export type GalleryPageBody = z.infer<typeof galleryPageBodySchema>;

/** Both lists page the same way. */
export const pageQuerySchema = z.object({
  cursor: keysetCursor.schema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LAURA.GALLERY.LIMIT.MAX)
    .default(LAURA.GALLERY.LIMIT.DEFAULT),
});

/** The Image a Favorite write names. */
export const imageIdParamSchema = z.object({ imageId: z.string().min(1) });

/** What a write answers: the Image and whether it is a Favorite now. */
export const favoriteBodySchema = z
  .object({ favorite: z.boolean(), imageId: z.string() })
  .meta({ ref: "Favorite" });
export type FavoriteBody = z.infer<typeof favoriteBodySchema>;
