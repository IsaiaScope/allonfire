import { manageGuard } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { createFactory } from "hono/factory";
import type { OverviewBody } from "../constants/schemas";
import type { StorageUsageDeps } from "../utils/deps";
import { overviewRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/** The buckets and the Images side by side: a bucket that cannot be listed leaves the rest. */
export const overviewHandlers = (deps: StorageUsageDeps) =>
  factory.createHandlers(
    overviewRoute,
    manageGuard(deps.canManage),
    async (c) => {
      const [avatars, images, buckets] = await Promise.all([
        deps.avatars(),
        deps.imageStats(),
        deps.buckets(),
      ]);
      return c.json(
        {
          avatars: { byApp: avatars },
          buckets: buckets.map(({ id, kind, reading }) => ({
            id,
            kind,
            reading,
          })),
          images,
        } satisfies OverviewBody,
        HTTP.STATUS.OK
      );
    }
  );
