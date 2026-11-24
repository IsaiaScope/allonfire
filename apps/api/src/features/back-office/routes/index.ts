import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { userRoutes } from "@allonfire/auth/features/users/hono/routes";
import { Hono } from "hono";
import { BACK_OFFICE } from "../constants/back-office";
import { overviewRoutes } from "../overview/routes";
import type { BackOfficeDeps } from "../utils/deps";

/** Everything only Back Office Admins call, under `/v1/back-office` (ADR 0035). */
export const backOfficeRoutes = (deps: BackOfficeDeps) =>
  new Hono<AuthEnv>()
    .route(USER.PATH.BASE, userRoutes(deps.users))
    .route(BACK_OFFICE.OVERVIEW.PATH.BASE, overviewRoutes(deps));
