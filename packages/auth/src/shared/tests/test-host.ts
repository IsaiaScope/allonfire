import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import {
  HTTP,
  type HttpMethod,
} from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AuthEnv } from "../../features/hono/types/variables";
import { AUTH } from "../constants/auth";
import type { AuthSession } from "../types/auth";

/**
 * The smallest host for an HTTP module's tests: a Session, the module mounted
 * at `path`, and an `onError` that answers the module's contract as plain
 * JSON (a CodedError's code, errors and values; an HTTPException's status;
 * `INTERNAL_ERROR` for anything else), so a test checks what the module
 * throws and not any host's problem format.
 */
export const moduleTestHost = ({
  path,
  routes,
  session,
}: {
  session: AuthSession | null;
  path: string;
  routes: Hono<AuthEnv>;
}): Hono<AuthEnv> =>
  new Hono<AuthEnv>()
    .use((c, next) => {
      c.set(AUTH.VAR.SESSION, session);
      return next();
    })
    .route(path, routes)
    .onError((err) => {
      if (err instanceof CodedError) {
        return Response.json(
          { code: err.code, errors: err.errors, values: err.values },
          { status: err.status }
        );
      }
      if (err instanceof HTTPException) {
        return Response.json({}, { status: err.status });
      }
      return Response.json(
        { code: ERROR.CODE.INTERNAL_ERROR },
        { status: HTTP.STATUS.INTERNAL_SERVER_ERROR }
      );
    });

const contractSchema = z.object({
  code: z.string(),
  errors: z
    .array(z.object({ message: z.string(), path: z.string() }))
    .optional(),
  values: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

/** A request sending `body` as JSON. */
export const json = <T>(
  method: HttpMethod,
  body: T & Json<T>
): RequestInit => ({
  body: stringifyJson(body),
  headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
  method,
});

/** The module's error, as the test host answered it. */
export const errorOf = async (res: Response) =>
  contractSchema.parse(await res.json());
