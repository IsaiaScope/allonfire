import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { LAURA_FAVORITES } from "../favorites/constants/favorites";
import { LAURA_GALLERY } from "../gallery/constants/gallery";

const SEGMENT = ACCESS.APP_SETTINGS[App.LAURA].slug;

/** Laura's own routes: data only Laura's screens call (ADR 0035). */
export const LAURA = {
  /** The Favorites list's constants. */
  FAVORITES: LAURA_FAVORITES,
  /** The Gallery list's constants. */
  GALLERY: LAURA_GALLERY,
  /** The docs group Laura's tags (Gallery, Favorites) under this name. */
  OPENAPI_GROUP: "Laura",
  PATH: { BASE: `/${SEGMENT}` },
  /** The key under `client.v1`, and the App's folder under `apps/`. */
  SEGMENT,
} as const;
