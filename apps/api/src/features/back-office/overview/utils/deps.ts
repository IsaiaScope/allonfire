import type { OverviewStorageDeps } from "../storage/utils/deps";
import type { OverviewUsersDeps } from "../users/utils/deps";

/** What the two overviews need of the stack; tests stub each. */
export type OverviewDeps = {
  /** The Storage overview's stack: the bucket, the Images' stats and who may read them. */
  overviewStorage: OverviewStorageDeps;
  /** The Users overview's stack: the Users' stats and who may read them. */
  overviewUsers: OverviewUsersDeps;
};
