import { AUTH_VAR } from "@allonfire/auth/features/hono/constants/variables";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { IMAGE_PATH } from "../../constants/paths";
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
      c.set(AUTH_VAR.SESSION, session);
      return next();
    })
    .route(IMAGE_PATH, imageRoutes(stubImageDeps(images)))
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
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return Response.json({ code: "HOST" }, { status });
    });

const contractSchema = z.object({
  code: z.string(),
  errors: z
    .array(z.object({ message: z.string(), path: z.string() }))
    .optional(),
  values: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

/** The module's error, as the test host answered it. */
export const errorOf = async (res: Response) =>
  contractSchema.parse(await res.json());
