import { manageGuard } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { createFactory } from "hono/factory";
import type { OverviewBody } from "../constants/schemas";
import type { UserUsageDeps } from "../utils/deps";
import { overviewRoute } from "./routes";

const factory = createFactory<AuthEnv>();

export const overviewHandlers = (deps: UserUsageDeps) =>
  factory.createHandlers(
    overviewRoute,
    manageGuard(deps.canManage),
    async (c) =>
      c.json((await deps.userStats()) satisfies OverviewBody, HTTP.STATUS.OK)
  );
