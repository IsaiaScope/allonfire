import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AvatarOwner } from "@allonfire/database/features/auth/avatar-owners";
import { avatarKeyOf } from "@allonfire/storage/features/avatar/utils/avatar-key";
import type { ObjectSize } from "@allonfire/storage/features/s3/utils/objects";
import { STORAGE_USAGE } from "../constants/storage-usage";

/** One App's Avatars: how many and their bytes together. */
export type AvatarAppStat = { app: App; bytes: number; count: number };

/**
 * The Avatars' bytes per App: each User's own Avatar file (a provider's
 * picture, or a name the bucket does not hold, is no Avatar here), counted in
 * every App the User is a member of, as an Image placed in several Apps is.
 * Only Apps that have an Avatar come back, in the App enum's order.
 * @internal
 */
export const avatarsByApp = (
  owners: readonly AvatarOwner[],
  sizes: readonly ObjectSize[]
): AvatarAppStat[] => {
  const bytesOf = new Map(sizes.map(({ bytes, key }) => [key, bytes]));
  const rows = new Map<App, AvatarAppStat>();
  for (const { apps, image } of owners) {
    const key = avatarKeyOf(image);
    const bytes = key ? bytesOf.get(key) : undefined;
    if (bytes === undefined) {
      continue;
    }
    for (const app of apps) {
      const row = rows.get(app) ?? { app, bytes: 0, count: 0 };
      row.bytes += bytes;
      row.count += 1;
      rows.set(app, row);
    }
  }
  return objectValues(App).flatMap((app) => rows.get(app) ?? []);
};

type AvatarReaderDeps = {
  logger: { warn: (fields: object, message: string) => void };
  owners: () => Promise<readonly AvatarOwner[]>;
  /** Lists the Avatars' files; throws when the provider refuses. */
  sizes: () => Promise<readonly ObjectSize[]>;
};

/**
 * The Avatars per App for the Storage overview, read fresh (a few files). A
 * database or a listing that fails reads as none and is logged, never
 * thrown: the chart goes without Avatars, as a bucket that cannot be listed
 * goes without its reading.
 */
export const createAvatarReader =
  (deps: AvatarReaderDeps) => async (): Promise<AvatarAppStat[]> => {
    try {
      const [owners, sizes] = await Promise.all([deps.owners(), deps.sizes()]);
      return avatarsByApp(owners, sizes);
    } catch (error) {
      deps.logger.warn(
        { err: error },
        STORAGE_USAGE.LOG_MESSAGE.AVATARS_UNREADABLE
      );
      return [];
    }
  };
