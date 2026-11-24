import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type {
  markFavorite,
  unmarkFavorite,
} from "@allonfire/database/features/apps/laura/favorite.service";
import type {
  listFavoritesPage,
  listGalleryPage,
} from "@allonfire/database/features/apps/laura/gallery.service";
import type { ensureLauraProfile } from "@allonfire/database/features/apps/laura/profile.service";

/** What Laura's routes need of the stack; tests stub it. */
export type LauraDeps = {
  /** A Laura Admin, read now, on a Session still there. */
  canManage: CanManage;
  /** First use: the caller's Profile, with the Favorites copied in. False when they hold no Laura Membership. */
  ensureProfile: typeof ensureLauraProfile;
  listFavoritesPage: typeof listFavoritesPage;
  listGalleryPage: typeof listGalleryPage;
  markFavorite: typeof markFavorite;
  unmarkFavorite: typeof unmarkFavorite;
};
