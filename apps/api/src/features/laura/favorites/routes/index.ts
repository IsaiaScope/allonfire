import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { API } from "../../../../shared/constants/api";
import { LAURA } from "../../constants/laura";
import type { LauraDeps } from "../../utils/deps";
import { favoritesHandlers, markHandlers, unmarkHandlers } from "./handlers";

/** The Favorites list for every Laura User, and the Admins' mark and clear. */
export const favoritesRoutes = (deps: LauraDeps) =>
  new Hono<AuthEnv>()
    .get(API.PATH.ROOT, ...favoritesHandlers(deps))
    .put(LAURA.FAVORITES.PATH.ONE, ...markHandlers(deps))
    .delete(LAURA.FAVORITES.PATH.ONE, ...unmarkHandlers(deps));
