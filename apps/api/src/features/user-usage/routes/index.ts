import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { USER_USAGE } from "../constants/user-usage";
import type { UserUsageDeps } from "../utils/deps";
import { overviewHandlers } from "./handlers";

/** The Users overview: Back Office Admins read how many Users each App has. */
export const userUsageRoutes = (deps: UserUsageDeps) =>
  new Hono<AuthEnv>().get(USER_USAGE.PATH.OVERVIEW, ...overviewHandlers(deps));
