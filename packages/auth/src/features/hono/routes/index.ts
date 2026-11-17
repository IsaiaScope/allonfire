import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { AUTH } from "../../../shared/constants/auth";
import type { AuthLike } from "../../../shared/types/auth";
import {
  isOutsideDomain,
  withoutDomain,
} from "../../server/utils/cookie-domain";

/**
 * Better Auth's answer, with each Session cookie's Domain taken off when the
 * request's Origin is outside the host's cookie domain (Local, where a page
 * on `localhost` and one on the tailnet both sign in): the browser would
 * drop the cookie, so it stays on the host that answered. With the Origin
 * under the domain, as every App's is in Production, the answer goes through
 * as it is.
 */
const answerFor = (
  response: Response,
  origin: string | undefined,
  domain: string | undefined
) => {
  const cookies = response.headers.getSetCookie();
  if (cookies.length === 0 || !isOutsideDomain(origin, domain)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.delete(HTTP.HEADER.SET_COOKIE);
  for (const cookie of cookies) {
    headers.append(HTTP.HEADER.SET_COOKIE, withoutDomain(cookie));
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

/** Mount at the root: the routes already sit under the instance's `basePath`. */
export const authRoutes = (auth: AuthLike) =>
  new Hono().on([...AUTH.METHODS], `${auth.basePath}/*`, async (context) =>
    answerFor(
      await auth.handler(context.req.raw),
      context.req.header(HTTP.HEADER.ORIGIN),
      auth.cookieDomain
    )
  );
