import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { API } from "../../../../shared/constants/api";
import type { LauraDeps } from "../../utils/deps";
import { galleryHandlers } from "./handlers";

/** The Gallery list. */
export const galleryRoutes = (deps: LauraDeps) =>
  new Hono<AuthEnv>().get(API.PATH.ROOT, ...galleryHandlers(deps));
