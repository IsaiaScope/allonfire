import { SECURITY_HEADERS } from "@allonfire/core/features/http/constants/security-headers";
import type { MiddlewareHandler } from "hono";
import { every } from "hono/combine";
import { secureHeaders } from "hono/secure-headers";

/**
 * Hono's `secureHeaders` defaults, then the headers every allonfire app sends
 * on top. `secureHeaders` writes after the handler, so ours are written after
 * it, or its `SAMEORIGIN` and 180-day HSTS would win.
 */
export const securityHeaders = (): MiddlewareHandler =>
  every(async (context, next) => {
    await next();
    for (const header of SECURITY_HEADERS) {
      context.header(header.key, header.value);
    }
  }, secureHeaders());
