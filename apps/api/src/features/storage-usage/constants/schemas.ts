import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { z } from "zod";
import { STORAGE_USAGE } from "./storage-usage";

const countSchema = z.number().int().nonnegative();

/** What a bucket held when it was listed. */
export const bucketReadingBodySchema = z.object({
  /** When it was listed (ISO): the kept copy's time, not the request's. */
  asOf: z.iso.datetime(),
  bytes: countSchema,
  objects: countSchema,
});

/** What a bucket holds (`STORAGE_USAGE.BUCKET_KIND`). */
export const bucketKindSchema = z.enum(STORAGE_USAGE.BUCKET_KIND);

/** One bucket the API reads. */
const bucketBodySchema = z.object({
  /** The bucket's name, as it is configured. */
  id: z.string(),
  /** What it holds: the Back Office draws its card by this, never by the name. */
  kind: bucketKindSchema,
  /** Null: the bucket could not be listed just now. */
  reading: bucketReadingBodySchema.nullable(),
});

const imageAppStatBodySchema = z.object({
  app: appSchema,
  privateBytes: countSchema,
  privateCount: countSchema,
  publicBytes: countSchema,
  publicCount: countSchema,
});

const avatarAppStatBodySchema = z.object({
  app: appSchema,
  bytes: countSchema,
  count: countSchema,
});

export const overviewBodySchema = z
  .object({
    avatars: z.object({
      /** Per App that has an Avatar; a User in two Apps is in both rows. */
      byApp: z.array(avatarAppStatBodySchema),
    }),
    buckets: z.array(bucketBodySchema),
    images: z.object({
      /** Per App that has an Image; an Image in two Apps is in both rows. */
      byApp: z.array(imageAppStatBodySchema),
      total: countSchema,
      totalBytes: countSchema,
    }),
  })
  .meta({ ref: "StorageOverview" });
export type OverviewBody = z.infer<typeof overviewBodySchema>;
