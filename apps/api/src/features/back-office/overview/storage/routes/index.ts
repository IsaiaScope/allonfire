import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { API } from "../../../../../shared/constants/api";
import type { OverviewStorageDeps } from "../utils/deps";
import { overviewHandlers } from "./handlers";

/** The Storage overview: Back Office Admins read how full the Images' bucket is. */
export const overviewStorageRoutes = (deps: OverviewStorageDeps) =>
  new Hono<AuthEnv>().get(API.PATH.ROOT, ...overviewHandlers(deps));
