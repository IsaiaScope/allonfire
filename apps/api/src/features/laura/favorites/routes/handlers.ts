import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import { manageGuard } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import {
  invalidHook,
  notFound,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App, Role } from "@allonfire/database/enums";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { type FavoriteBody, imageIdParamSchema } from "../../constants/schemas";
import type { LauraDeps } from "../../utils/deps";
import { pageHandlers } from "../../utils/page-handlers";
import { favoritesRoute, markRoute, unmarkRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/** One page of the caller's own Favorites. */
export const favoritesHandlers = (deps: LauraDeps) =>
  pageHandlers(favoritesRoute, deps, deps.listFavoritesPage);

/**
 * Marks an Image as a Favorite for every Laura User. The order is the
 * contract: the cheap role door, then the fresh read, then the parse and the
 * write. 404 when the Image is not placed in Laura.
 */
export const markHandlers = (deps: LauraDeps) =>
  factory.createHandlers(
    markRoute,
    requireApp(App.LAURA, Role.ADMIN),
    manageGuard(deps.canManage),
    validator("param", imageIdParamSchema, invalidHook),
    async (c) => {
      const { imageId } = c.req.valid("param");
      if (!(await deps.markFavorite(imageId))) {
        throw notFound();
      }
      return c.json(
        { favorite: true, imageId } satisfies FavoriteBody,
        HTTP.STATUS.OK
      );
    }
  );

/** Clears a Favorite for every Laura User; one that is not, or an Image that is not there, is no error. */
export const unmarkHandlers = (deps: LauraDeps) =>
  factory.createHandlers(
    unmarkRoute,
    requireApp(App.LAURA, Role.ADMIN),
    manageGuard(deps.canManage),
    validator("param", imageIdParamSchema, invalidHook),
    async (c) => {
      const { imageId } = c.req.valid("param");
      await deps.unmarkFavorite(imageId);
      return c.json(
        { favorite: false, imageId } satisfies FavoriteBody,
        HTTP.STATUS.OK
      );
    }
  );
