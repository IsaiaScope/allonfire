import {
  appSchema,
  imageAccessSchema,
} from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/utils/alt";
import { z } from "zod";

/** The shared schemas, named as this module's Models. */
export const appBodySchema = appSchema.meta({ ref: "App" });
export const imageAltBodySchema = imageAltSchema.meta({ ref: "ImageAlt" });
export const imageAccessBodySchema = imageAccessSchema.meta({
  ref: "ImageAccess",
});

/** One signed image-server link to the picture at one width. */
const signedLinkSchema = z
  .object({ url: z.string(), width: z.number().int() })
  .meta({ ref: "SignedLink" });
export type SignedLink = z.infer<typeof signedLinkSchema>;

/**
 * One Image as it travels: the stored record, minus what only the server
 * reads (`uploadedBy`), with `createdAt` as ISO
 * text, and the picture as signed links, one per width (`srcSet`): a public
 * Image's never expire, a private one's within the hour. `apps` lists every
 * App it is in, the ones the caller cannot see too: a PATCH sends the full
 * new list, so an Admin of one App needs the others to keep them. The Image
 * module answers it; a UI picks its props from it.
 */
export const imageBodySchema = z
  .object({
    access: imageAccessBodySchema,
    alt: imageAltBodySchema,
    apps: z.array(appBodySchema),
    blurDataUrl: z.string(),
    /** The stored file's size. */
    bytes: z.number().int(),
    createdAt: z.iso.datetime(),
    height: z.number().int(),
    id: z.string(),
    /** The stored file's name in the image bucket (`<uuid>.avif`): what the storage console lists. */
    key: z.string(),
    srcSet: z.array(signedLinkSchema),
    /** Its Version: a PATCH sends it back, and is refused (409) once the Image changed. */
    version: z.string(),
    width: z.number().int(),
  })
  .meta({ ref: "Image" });
export type ImageBody = z.infer<typeof imageBodySchema>;
