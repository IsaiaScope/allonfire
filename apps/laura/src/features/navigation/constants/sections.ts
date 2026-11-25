import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { Role } from "@allonfire/database/enums";
import type { AppSection } from "@allonfire/ui/features/navigation/types/app-descriptor";
import {
  IconCards,
  IconPhoto,
  IconPhotoCirclePlus,
  IconPhotoStar,
  IconTrophy,
} from "@tabler/icons-react";
import { LAURA_BASE } from "@/shared/constants/laura-base";

/** Favorites is drawn with a starred photo, never a heart. */
const FAVORITES = {
  icon: IconPhotoStar,
  label: "favorites",
  path: LAURA_BASE.PAGE.FAVORITES,
} as const satisfies AppSection;
/** Home is the Gallery. */
const GALLERY = {
  icon: IconPhoto,
  label: "gallery",
  path: AUTH.PAGE.HOME,
} as const satisfies AppSection;
const MEMORY = {
  icon: IconCards,
  label: "memory",
  pages: [
    { icon: IconCards, label: "play", path: LAURA_BASE.PAGE.MEMORY },
    {
      icon: IconTrophy,
      label: "leaderboard",
      path: LAURA_BASE.PAGE.LEADERBOARD,
    },
  ],
  path: LAURA_BASE.PAGE.MEMORY,
} as const satisfies AppSection;
const UPLOAD = {
  icon: IconPhotoCirclePlus,
  label: "upload",
  minRole: Role.ADMIN,
  path: LAURA_BASE.PAGE.UPLOAD,
} as const satisfies AppSection;

/**
 * Laura's Sections: the sidebar and the proxy's sign-in gate both read
 * `LIST`, and a test checks that every page under `(signed-in)` is in it and
 * gates itself. Each `label` is a key of `Navigation` (its menu label and
 * page title).
 */
export const SECTION = {
  FAVORITES,
  GALLERY,
  /** The menu's order: an explicit list, since Biome sorts the object's keys. */
  LIST: [GALLERY, FAVORITES, MEMORY, UPLOAD],
  MEMORY,
  UPLOAD,
} as const;
