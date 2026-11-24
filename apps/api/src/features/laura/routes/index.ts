import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { LAURA } from "../constants/laura";
import { favoritesRoutes } from "../favorites/routes";
import { galleryRoutes } from "../gallery/routes";
import type { LauraDeps } from "../utils/deps";

/** Everything only Laura's screens call, under `/v1/laura` (ADR 0035). */
export const lauraRoutes = (deps: LauraDeps) =>
  new Hono<AuthEnv>()
    .route(LAURA.GALLERY.PATH.BASE, galleryRoutes(deps))
    .route(LAURA.FAVORITES.PATH.BASE, favoritesRoutes(deps));
