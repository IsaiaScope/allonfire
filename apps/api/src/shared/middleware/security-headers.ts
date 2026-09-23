import { securityHeaders as sharedHeaders } from "@allonfire/utils/security-headers";
import type { MiddlewareHandler } from "hono";
import { every } from "hono/combine";
import { secureHeaders } from "hono/secure-headers";

/** The headers every allonfire app sends, then Hono's `secureHeaders` defaults. */
export const securityHeaders = (): MiddlewareHandler =>
  every(async (context, next) => {
    for (const header of sharedHeaders) {
      context.header(header.key, header.value);
    }
    await next();
  }, secureHeaders());
