import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type {
  markFavorite,
  unmarkFavorite,
} from "@allonfire/database/features/apps/laura/favorite.service";
import type {
  listFavoritesPage,
  listGalleryPage,
} from "@allonfire/database/features/apps/laura/gallery.service";
import type {
  memoryLeaderboard,
  memoryStats,
  submitMemoryScore,
  userMemoryStats,
} from "@allonfire/database/features/apps/laura/memory-score.service";
import type { ensureLauraProfile } from "@allonfire/database/features/apps/laura/profile.service";
import type { randomImages } from "@allonfire/database/features/image/random-images";
import type { avatarLink } from "@allonfire/storage/features/avatar/utils/avatar-key";

/** What Laura's routes need of the stack; tests stub it. */
export type LauraDeps = {
  /** A User's stored Avatar as an hour-long signed link, or none. */
  avatarLink: typeof avatarLink;
  /** A Laura Member of any Role, read now, on a Session still there: who may write a score. */
  canPlay: CanManage;
  /** A Laura Admin, read now, on a Session still there. */
  canManage: CanManage;
  /** First use: the caller's Profile, with the Favorites copied in. False when they hold no Laura Membership. */
  ensureProfile: typeof ensureLauraProfile;
  listFavoritesPage: typeof listFavoritesPage;
  listGalleryPage: typeof listGalleryPage;
  markFavorite: typeof markFavorite;
  memoryLeaderboard: typeof memoryLeaderboard;
  memoryStats: typeof memoryStats;
  randomImages: typeof randomImages;
  submitMemoryScore: typeof submitMemoryScore;
  unmarkFavorite: typeof unmarkFavorite;
  userMemoryStats: typeof userMemoryStats;
};
