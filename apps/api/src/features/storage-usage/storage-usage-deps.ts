import { avatarOwners } from "@allonfire/database/features/auth/avatar-owners";
import { imageStats } from "@allonfire/database/features/image/image-stats";
import { avatarObjectSizes } from "@allonfire/storage/features/image/objects/utils/image-objects";
import { logger } from "../logger/logger";
import { sharedRedis } from "../redis/shared-redis";
import { canManageUsers } from "../users/user-deps";
import { BUCKETS } from "./buckets";
import { createAvatarReader } from "./utils/avatar-usage";
import { createBucketReader } from "./utils/bucket-reader";
import type { StorageUsageDeps } from "./utils/deps";

const readers = BUCKETS.map(({ id, kind, list }) => ({
  id,
  kind,
  read: createBucketReader({ id, list, logger, redis: () => sharedRedis }),
}));

const readAvatars = createAvatarReader({
  logger,
  owners: avatarOwners,
  sizes: avatarObjectSizes,
});

/** The Storage overview on the real stack: Prisma, MinIO and the shared Redis. */
export const storageUsageDeps: StorageUsageDeps = {
  avatars: readAvatars,
  buckets: () =>
    Promise.all(
      readers.map(async ({ id, kind, read }) => ({
        id,
        kind,
        reading: await read(),
      }))
    ),
  canManage: canManageUsers,
  imageStats,
};
