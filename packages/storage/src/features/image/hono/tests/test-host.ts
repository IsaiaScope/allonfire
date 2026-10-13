import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { STORAGE } from "../../../../shared/constants/paths";
import { imageRoutes } from "../routes/index";
import type { ImageDeps } from "../utils/deps";
import { stubImageDeps } from "./stub-image-deps";

/**
 * The smallest host: a Session, the module, and an `onError` that answers the
 * module's contract as plain JSON, so these tests check what the module throws
 * and not any host's problem format.
 */
export const testHost = (
  session: AuthSession | null,
  images: Partial<ImageDeps> = {}
) =>
  new Hono<AuthEnv>()
    .use((c, next) => {
      c.set(AUTH.VAR.SESSION, session);
      return next();
    })
    .route(STORAGE.PATH.IMAGES, imageRoutes(stubImageDeps(images)))
    .onError((err) => {
      if (err instanceof CodedError) {
        return Response.json(
          { code: err.code, errors: err.errors, values: err.values },
          { status: err.status }
        );
      }
      const status =
        err instanceof HTTPException
          ? err.status
          : HTTP.STATUS.INTERNAL_SERVER_ERROR;
      return Response.json({ code: "HOST" }, { status });
    });

const contractSchema = z.object({
  code: z.string(),
  errors: z
    .array(z.object({ message: z.string(), path: z.string() }))
    .optional(),
  values: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

/** A request sending `body` as JSON. */
export const json = <T>(method: string, body: T & Json<T>) => ({
  body: stringifyJson(body),
  headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
  method,
});

/** The module's error, as the test host answered it. */
export const errorOf = async (res: Response) =>
  contractSchema.parse(await res.json());
