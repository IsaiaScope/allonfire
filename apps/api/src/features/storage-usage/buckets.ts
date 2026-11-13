import { env } from "@allonfire/storage/environment/environment";
import { imageBucketTotals } from "@allonfire/storage/features/image/objects/utils/image-objects";
import { sharedRedis } from "../redis/shared-redis";
import { STORAGE_USAGE } from "./constants/storage-usage";
import { forgetBucket } from "./utils/bucket-reader";

/**
 * The buckets the overview lists: one line each, its name and how to total
 * it. A bucket added later is one more line here (and a card in the Back
 * Office's registry); the API's storage login must be allowed to list it.
 */
export const BUCKETS = [
  {
    id: env.STORAGE_BUCKET,
    kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
    list: imageBucketTotals,
  },
] as const;

/** Drops every bucket's kept totals: a write (an Image, an Avatar, a deleted User) moved what they hold. */
export const forgetBuckets = async () => {
  await Promise.all(
    BUCKETS.map(({ id }) => forgetBucket(() => sharedRedis, id))
  );
};
