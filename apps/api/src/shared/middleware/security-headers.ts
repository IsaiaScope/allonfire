import { SECURITY_HEADERS } from "@allonfire/utils/constants/security-headers";
import type { MiddlewareHandler } from "hono";
import { every } from "hono/combine";
import { secureHeaders } from "hono/secure-headers";

/** The headers every allonfire app sends, then Hono's `secureHeaders` defaults. */
export const securityHeaders = (): MiddlewareHandler =>
  every(async (context, next) => {
    for (const header of SECURITY_HEADERS) {
      context.header(header.key, header.value);
    }
    await next();
  }, secureHeaders());
