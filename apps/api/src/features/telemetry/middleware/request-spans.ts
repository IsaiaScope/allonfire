import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { context as otelContext, trace } from "@opentelemetry/api";
import { suppressTracing } from "@opentelemetry/core";
import type { MiddlewareHandler } from "hono";
import pkg from "../../../../package.json" with { type: "json" };
import { isProbe } from "../../../shared/utils/probe";
import { env } from "../../environment/environment";
import { URL_ATTRIBUTE } from "../constants/telemetry";

/**
 * One server span and one `http.server.request.duration` point per request,
 * from `@hono/otel`, with three corrections on top:
 *
 * - Probes trace nothing, not even the database check `/ready` runs: they are
 *   self-generated on a fixed schedule and would bury real traffic.
 * - `url.full` loses its query string, where reset and magic-link tokens travel,
 *   and the server-span attributes the semantic conventions require are added.
 * - A 4xx stays unset rather than error, as the conventions require: only the
 *   server failing is an error. `@hono/otel` marks any `c.error` as one.
 *
 * A no-op until the SDK starts. It binds its meter when created, which is why
 * `index.ts` starts telemetry before building the app.
 */
export const requestSpans = (): MiddlewareHandler => {
  const httpSpans = httpInstrumentationMiddleware({
    serviceName: env.OTEL_SERVICE_NAME,
    serviceVersion: pkg.version,
  });

  return (context, next) =>
    isProbe(context.req.path)
      ? otelContext.with(suppressTracing(otelContext.active()), next)
      : httpSpans(context, async () => {
          const url = new URL(context.req.url);
          trace.getActiveSpan()?.setAttributes({
            [URL_ATTRIBUTE.FULL]: `${url.origin}${url.pathname}`,
            [URL_ATTRIBUTE.PATH]: url.pathname,
            // `protocol` keeps its trailing colon: "http:".
            [URL_ATTRIBUTE.SCHEME]: url.protocol.slice(0, -1),
          });

          await next();

          if (context.res.status < HTTP_STATUS.INTERNAL_SERVER_ERROR) {
            context.error = undefined;
          }
        });
};
