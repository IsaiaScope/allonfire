import { AUTH_VAR } from "@allonfire/auth/features/hono/constants/variables";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import {
  canSeeImage,
  enterableApps,
} from "@allonfire/database/features/auth/access/access";
import { sValidator } from "@hono/standard-validator";
import { createFactory } from "hono/factory";
import { toImageBody } from "../../constants/schemas";
import {
  type ImageListBody,
  idParamSchema,
  listQuerySchema,
} from "../constants/schemas";
import { encodeCursor } from "../utils/cursor";
import type { ImageDeps } from "../utils/deps";
import { notFound } from "../utils/errors";
import { throwOnInvalid } from "../utils/validation";
import { getRoute, listRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/**
 * The Images visible in `app`, or in any App when it is left out (ADR 0020).
 * No Session needed and nobody is refused: a visitor, or a User who cannot
 * enter `app`, gets its public Images, so an App can have public pages.
 */
export const listHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    listRoute,
    sValidator("query", listQuerySchema, throwOnInvalid),
    async (c) => {
      const query = c.req.valid("query");
      const images = await deps.listImages({
        ...query,
        enterable: enterableApps(c.get(AUTH_VAR.SESSION)?.user ?? null),
      });
      const last = images.at(-1);
      const body = {
        images: images.map(toImageBody),
        nextCursor:
          images.length === query.limit && last ? encodeCursor(last) : null,
      } satisfies ImageListBody;
      return c.json(body, HTTP_STATUS.OK);
    }
  );

/** One Image, when it is visible in any App; no Session needed. */
export const getHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    getRoute,
    sValidator("param", idParamSchema, throwOnInvalid),
    async (c) => {
      const image = await deps.getImage(c.req.valid("param").id);
      const user = c.get(AUTH_VAR.SESSION)?.user ?? null;
      // Hidden is missing: a 403 would tell someone who cannot see it that the id exists.
      if (!(image && canSeeImage(user, image.apps))) {
        throw notFound();
      }
      return c.json(toImageBody(image), HTTP_STATUS.OK);
    }
  );
