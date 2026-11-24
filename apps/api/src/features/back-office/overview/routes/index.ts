import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { BACK_OFFICE } from "../../constants/back-office";
import { overviewStorageRoutes } from "../storage/routes";
import { overviewUsersRoutes } from "../users/routes";
import type { OverviewDeps } from "../utils/deps";

/** The Users' and the Storage's overviews: Back Office Admins read how many Users and how many bytes. */
export const overviewRoutes = (deps: OverviewDeps) =>
  new Hono<AuthEnv>()
    .route(
      BACK_OFFICE.OVERVIEW.USERS.PATH.BASE,
      overviewUsersRoutes(deps.overviewUsers)
    )
    .route(
      BACK_OFFICE.OVERVIEW.STORAGE.PATH.BASE,
      overviewStorageRoutes(deps.overviewStorage)
    );
