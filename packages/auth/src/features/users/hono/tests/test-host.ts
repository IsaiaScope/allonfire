import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AUTH } from "../../../../shared/constants/auth";
import type { AuthSession } from "../../../../shared/types/auth";
import type { AuthEnv } from "../../../hono/types/variables";
import { USER } from "../../constants/users";
import { userRoutes } from "../routes/index";
import type { UserDeps } from "../utils/deps";

/**
 * The smallest host: a Session, the module, and an `onError` answering with
 * the status and a coded error's code alone, so these tests check what the
 * module throws and not any host's problem format.
 */
export const testHost = (session: AuthSession | null, users: UserDeps) =>
  new Hono<AuthEnv>()
    .use((c, next) => {
      c.set(AUTH.VAR.SESSION, session);
      return next();
    })
    .route(USER.PATH.BASE, userRoutes(users))
    .onError((err) => {
      if (err instanceof CodedError) {
        return Response.json({ code: err.code }, { status: err.status });
      }
      return Response.json(
        {},
        {
          status:
            err instanceof HTTPException
              ? err.status
              : HTTP.STATUS.INTERNAL_SERVER_ERROR,
        }
      );
    });
