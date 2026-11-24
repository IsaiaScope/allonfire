import { App } from "@allonfire/database/enums";
import {
  markFavorite,
  unmarkFavorite,
} from "@allonfire/database/features/apps/laura/favorite.service";
import {
  listFavoritesPage,
  listGalleryPage,
} from "@allonfire/database/features/apps/laura/gallery.service";
import { ensureLauraProfile } from "@allonfire/database/features/apps/laura/profile.service";
import { adminOf } from "../../shared/utils/admin-of";
import type { LauraDeps } from "./utils/deps";

/** Laura's routes on the real stack: Prisma. */
export const lauraDeps: LauraDeps = {
  // Who may mark and clear Favorites: a Laura Admin.
  canManage: adminOf(App.LAURA),
  ensureProfile: ensureLauraProfile,
  listFavoritesPage,
  listGalleryPage,
  markFavorite,
  unmarkFavorite,
};
