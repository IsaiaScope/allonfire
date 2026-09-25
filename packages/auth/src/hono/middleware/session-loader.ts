import { HTTP_HEADER } from "@allonfire/utils/constants/http";
import type { MiddlewareHandler } from "hono";
import type { AuthLike } from "../../types/auth";
import { AUTH_VAR } from "../constants/variables";
import type { AuthEnv } from "../types/variables";

/**
 * Reads the Session once per request. A failing lookup throws on purpose: a
 * database outage must not quietly turn every User anonymous.
 *
 * Cookies Better Auth sets while reading go on the response, whatever it turns
 * out to be; dropped, the browser's cookie would never be renewed and the
 * cookie cache would never refill.
 */
export const sessionLoader =
  (auth: AuthLike): MiddlewareHandler<AuthEnv> =>
  async (context, next) => {
    const cookies: string[] = [];
    context.set(
      AUTH_VAR.SESSION,
      await auth.getSession(context.req.raw.headers, (cookie) =>
        cookies.push(cookie)
      )
    );
    await next();
    for (const cookie of cookies) {
      context.header(HTTP_HEADER.SET_COOKIE, cookie, { append: true });
    }
  };
