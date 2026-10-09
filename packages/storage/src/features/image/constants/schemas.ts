import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/alt";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { z } from "zod";

/** One App an Image is placed in, and whether it shows there to anyone (ADR 0020). */
export const imageLinkSchema = z.object({
  app: appSchema,
  public: z.boolean(),
});

/**
 * One Image as it travels: the stored record, minus what only the server
 * reads (`bytes`, `uploadedBy`), with `createdAt` as ISO text. `apps` lists
 * every placement, the ones the caller cannot see too: a PATCH sends the
 * full new list, so an Admin of one App needs the others to keep them. The
 * Image module answers it; a UI picks its props from it.
 */
export const imageBodySchema = z.object({
  alt: imageAltSchema,
  apps: z.array(imageLinkSchema),
  blurDataUrl: z.string(),
  createdAt: z.iso.datetime(),
  height: z.number().int(),
  id: z.string(),
  key: z.string(),
  width: z.number().int(),
});
export type ImageBody = z.infer<typeof imageBodySchema>;

export const toImageBody = (image: ImageRecord): ImageBody => ({
  alt: image.alt,
  apps: image.apps,
  blurDataUrl: image.blurDataUrl,
  createdAt: image.createdAt.toISOString(),
  height: image.height,
  id: image.id,
  key: image.key,
  width: image.width,
});
