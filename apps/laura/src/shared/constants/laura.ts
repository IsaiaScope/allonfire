import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { App, Role } from "@allonfire/database/enums";
import { BACK_OFFICE_LOGO } from "@allonfire/design/apps/back-office/back-office-logo";
import { LAURA_LOGO } from "@allonfire/design/apps/laura/laura-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import type {
  AppDescriptor,
  AppSection,
} from "@allonfire/ui/features/navigation/types/app-descriptor";
import {
  IconCards,
  IconPhoto,
  IconPhotoStar,
  IconTrophy,
  IconUpload,
} from "@tabler/icons-react";

/** Laura's own pages' paths, after the locale (Home, the Gallery, is `AUTH.PAGE.HOME`). */
const PAGE = {
  FAVORITES: "/favorites",
  LEADERBOARD: "/memory/leaderboard",
  MEMORY: "/memory",
  UPLOAD: "/upload",
} as const;

/**
 * Laura's Sections: each `label` is a key of `Navigation` (its menu label and
 * page title). Favorites is drawn with a starred photo, never a heart.
 */
export const SECTION = {
  FAVORITES: {
    icon: IconPhotoStar,
    label: "favorites",
    path: PAGE.FAVORITES,
  },
  /** Home is the Gallery. */
  GALLERY: { icon: IconPhoto, label: "gallery", path: AUTH.PAGE.HOME },
  MEMORY: {
    icon: IconCards,
    label: "memory",
    pages: [
      { icon: IconCards, label: "play", path: PAGE.MEMORY },
      { icon: IconTrophy, label: "leaderboard", path: PAGE.LEADERBOARD },
    ],
    path: PAGE.MEMORY,
  },
  UPLOAD: {
    icon: IconUpload,
    label: "upload",
    minRole: Role.ADMIN,
    path: PAGE.UPLOAD,
  },
} as const satisfies Record<string, AppSection>;

/** The menu's order: an explicit list, since Biome sorts the object's keys. */
export const SECTIONS = [
  SECTION.GALLERY,
  SECTION.FAVORITES,
  SECTION.MEMORY,
  SECTION.UPLOAD,
] as const;

/**
 * What Laura says about itself: the descriptor the shared frame, switcher and
 * head read, and its own `PAGE`s.
 */
export const LAURA = {
  app: App.LAURA,
  /** How Laura draws each App in its switcher. Keyed by `App`, so a new one fails here until it is listed. */
  entries: {
    [App.BACK_OFFICE]: {
      mark: { logo: BACK_OFFICE_LOGO },
      name: BACK_OFFICE_LOGO.name,
    },
    [App.LAURA]: { mark: { logo: LAURA_LOGO }, name: LAURA_LOGO.name },
  },
  /** Laura's line in the Ocean Design (the share card's top band). */
  line: OCEAN_IMAGE_COLOR.light.coral,
  logo: LAURA_LOGO,
  name: LAURA_LOGO.name,
  PAGE,
  sections: SECTIONS,
  /** The link-preview image's alt, the same in every language: two names. */
  shareImageAlt: `${LAURA_LOGO.name}, ${BRAND.NAME}`,
} as const satisfies AppDescriptor & Record<string, unknown>;
