import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  invalidHook,
  notFound,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  canSeeImage,
  enterableApps,
} from "@allonfire/database/features/auth/access/access";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { IMAGE } from "../../constants/image";
import {
  type ImagePageBody,
  idParamSchema,
  listQuerySchema,
} from "../constants/schemas";
import type { ImageDeps } from "../utils/deps";
import { toImageBody } from "../utils/image-body";
import { getRoute, listRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/**
 * A numbered page of the Images visible in `app`, or in any App when it is left out (ADR 0020).
 * No Session needed and nobody is refused: a visitor, or a User who cannot
 * enter `app`, gets its public Images, so an App can have public pages.
 */
export const listHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    listRoute,
    validator("query", listQuerySchema, invalidHook),
    async (c) => {
      const { app, page, perPage, search } = c.req.valid("query");
      const { access, app: apps, text } = IMAGE.SEARCH.parse(search);
      const { images, total, totalBytes } = await deps.listImagesPage({
        ...(access && { accesses: access }),
        ...(app && { app }),
        ...(apps && { apps }),
        enterable: enterableApps(c.get(AUTH.VAR.SESSION)?.user ?? null),
        page,
        perPage,
        ...(text && { text }),
      });
      const now = new Date();
      const body = {
        images: images.map((image) => toImageBody(image, now)),
        page,
        pageCount: Math.ceil(total / perPage),
        total,
        totalBytes,
      } satisfies ImagePageBody;
      return c.json(body, HTTP.STATUS.OK);
    }
  );

/** One Image, when it is visible in any App; no Session needed. */
export const getHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    getRoute,
    validator("param", idParamSchema, invalidHook),
    async (c) => {
      const image = await deps.getImage(c.req.valid("param").id);
      const user = c.get(AUTH.VAR.SESSION)?.user ?? null;
      // Hidden is missing: a 403 would tell someone who cannot see it that the id exists.
      if (!(image && canSeeImage(user, image))) {
        throw notFound();
      }
      return c.json(toImageBody(image, new Date()), HTTP.STATUS.OK);
    }
  );
