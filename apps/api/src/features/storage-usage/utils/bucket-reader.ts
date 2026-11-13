import type { BucketTotals } from "@allonfire/storage/features/s3/utils/objects";
import {
  type CacheRedis,
  cacheAside,
  type ForgetRedis,
  forgetCached,
} from "../../redis/utils/cache-aside";
import { bucketReadingBodySchema } from "../constants/schemas";
import { STORAGE_USAGE } from "../constants/storage-usage";
import type { BucketReading } from "./deps";

type BucketReaderDeps = {
  /** The bucket's name, as the body names it. */
  id: string;
  /** Lists the whole bucket; throws when the provider refuses. */
  list: () => Promise<BucketTotals>;
  logger: { warn: (fields: object, message: string) => void };
  now?: () => Date;
  redis: CacheRedis;
};

const bucketKey = (id: string) => `${STORAGE_USAGE.CACHE.KEY_PREFIX}${id}`;

/**
 * Drops a bucket's kept totals, so the next read lists it: an Image was
 * written, and the Storage overview must not set the database's fresh Image
 * bytes against a listing from before. A cache that is down has nothing to drop.
 */
export const forgetBucket = (redis: ForgetRedis, id: string): Promise<void> =>
  forgetCached(redis, bucketKey(id));

/**
 * A bucket listed for the Storage overview: kept in Redis under its own key for
 * `STORAGE_USAGE.CACHE.TTL_MS`, so a page and its prefetch walk the bucket
 * once. A listing that fails reads as null and is logged, never thrown.
 */
export const createBucketReader =
  (deps: BucketReaderDeps) => (): Promise<BucketReading | null> =>
    cacheAside({
      key: bucketKey(deps.id),
      load: async () => {
        try {
          const totals = await deps.list();
          const asOf = (deps.now ?? (() => new Date()))();
          return { ...totals, asOf: asOf.toISOString() };
        } catch (error) {
          deps.logger.warn(
            { err: error, id: deps.id },
            STORAGE_USAGE.LOG_MESSAGE.BUCKET_UNREADABLE
          );
          return null;
        }
      },
      redis: deps.redis,
      schema: bucketReadingBodySchema,
      ttlMs: STORAGE_USAGE.CACHE.TTL_MS,
    });
