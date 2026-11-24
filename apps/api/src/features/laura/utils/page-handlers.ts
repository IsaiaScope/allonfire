import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  forbidden,
  invalidHook,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { keysetCursor } from "@allonfire/core/features/search/keyset-cursor";
import { App } from "@allonfire/database/enums";
import type { GalleryPage } from "@allonfire/database/features/apps/laura/gallery.service";
import { createFactory } from "hono/factory";
import { type describeRoute, validator } from "hono-openapi";
import { type GalleryPageBody, pageQuerySchema } from "../constants/schemas";
import type { LauraDeps } from "./deps";
import { toGalleryItem } from "./gallery-body";

const factory = createFactory<AuthEnv>();

type ListPage = (args: {
  after?: Parameters<typeof keysetCursor.encode>[0] | undefined;
  limit: number;
  userId: string;
}) => Promise<GalleryPage>;

/**
 * The one way Laura answers a page: the door for Laura (`requireApp`), the
 * query, then the first-use step (`ensureProfile`, 403 when the caller has no
 * Laura Membership any more, the list never read), then the caller's own page.
 * The Gallery and the Favorites differ only in the list they read.
 */
export const pageHandlers = (
  route: ReturnType<typeof describeRoute>,
  deps: Pick<LauraDeps, "ensureProfile">,
  list: ListPage
) =>
  factory.createHandlers(
    route,
    requireApp(App.LAURA),
    validator("query", pageQuerySchema, invalidHook),
    async (c) => {
      const { cursor, limit } = c.req.valid("query");
      const { id: userId } = c.get(AUTH.VAR.SESSION).user;
      if (!(await deps.ensureProfile(userId))) {
        throw forbidden();
      }
      const { images, next } = await list({ after: cursor, limit, userId });
      const now = new Date();
      const body = {
        items: images.map((image) => toGalleryItem(image, now)),
        nextCursor: next ? keysetCursor.encode(next) : null,
      } satisfies GalleryPageBody;
      return c.json(body, HTTP.STATUS.OK);
    }
  );
