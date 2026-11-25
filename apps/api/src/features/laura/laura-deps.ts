import { App } from "@allonfire/database/enums";
import {
  markFavorite,
  unmarkFavorite,
} from "@allonfire/database/features/apps/laura/favorite.service";
import {
  listFavoritesPage,
  listGalleryPage,
} from "@allonfire/database/features/apps/laura/gallery.service";
import {
  memoryLeaderboard,
  memoryStats,
  submitMemoryScore,
  userMemoryStats,
} from "@allonfire/database/features/apps/laura/memory-score.service";
import { ensureLauraProfile } from "@allonfire/database/features/apps/laura/profile.service";
import { randomImages } from "@allonfire/database/features/image/random-images";
import { avatarLink } from "@allonfire/storage/features/avatar/utils/avatar-key";
import { adminOf, memberOf } from "../../shared/utils/admin-of";
import type { LauraDeps } from "./utils/deps";

/** Laura's routes on the real stack: Prisma. */
export const lauraDeps: LauraDeps = {
  avatarLink,
  // Who may mark and clear Favorites: a Laura Admin.
  canManage: adminOf(App.LAURA),
  // Who may write a score: any Laura Member, asked fresh like an Admin.
  canPlay: memberOf(App.LAURA),
  ensureProfile: ensureLauraProfile,
  listFavoritesPage,
  listGalleryPage,
  markFavorite,
  memoryLeaderboard,
  memoryStats,
  randomImages,
  submitMemoryScore,
  unmarkFavorite,
  userMemoryStats,
};
