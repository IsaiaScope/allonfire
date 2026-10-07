import { allowedAppSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/alt";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { z } from "zod";

/**
 * One Image as it travels: the stored record, minus what only the server
 * reads (`bytes`, `uploadedBy`), with `createdAt` as ISO text. The Image
 * module answers it; a UI picks its props from it.
 */
export const imageBodySchema = z.object({
  alt: imageAltSchema,
  app: allowedAppSchema,
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
  app: image.app,
  blurDataUrl: image.blurDataUrl,
  createdAt: image.createdAt.toISOString(),
  height: image.height,
  id: image.id,
  key: image.key,
  width: image.width,
});
