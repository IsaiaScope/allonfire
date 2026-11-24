import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { API } from "../../../../../shared/constants/api";
import type { OverviewUsersDeps } from "../utils/deps";
import { overviewHandlers } from "./handlers";

/** The Users overview: Back Office Admins read how many Users each App has. */
export const overviewUsersRoutes = (deps: OverviewUsersDeps) =>
  new Hono<AuthEnv>().get(API.PATH.ROOT, ...overviewHandlers(deps));
