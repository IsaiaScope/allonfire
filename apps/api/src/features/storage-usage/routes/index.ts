import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { STORAGE_USAGE } from "../constants/storage-usage";
import type { StorageUsageDeps } from "../utils/deps";
import { overviewHandlers } from "./handlers";

/** The Storage overview: Back Office Admins read how full the Images' bucket is. */
export const storageUsageRoutes = (deps: StorageUsageDeps) =>
  new Hono<AuthEnv>().get(
    STORAGE_USAGE.PATH.OVERVIEW,
    ...overviewHandlers(deps)
  );
