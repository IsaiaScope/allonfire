import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { LOG_LEVEL } from "@allonfire/utils/constants/logger";
import { objectFromEntries } from "@allonfire/utils/object";
import { pinoLogger } from "hono-pino";
import type { Logger } from "pino";
import { LOGGED_REQUEST_HEADERS } from "../../../shared/constants/runtime";
import { isProbe } from "../../../shared/utils/probe";
import { logger as defaultLogger } from "../logger";

/** One line per request, levelled by outcome. */
export const requestLogger = (logger: Logger = defaultLogger) =>
  pinoLogger({
    http: {
      // Only allowlisted headers: every request line now ships to
      // OpenObserve, and the rest (x-forwarded-for, user-agent,
      // traceparent) are client identifiers or noise.
      onReqBindings: (context) => ({
        req: {
          headers: objectFromEntries(
            LOGGED_REQUEST_HEADERS.flatMap((name) => {
              const value = context.req.header(name);
              return value === undefined ? [] : [[name, value] as const];
            })
          ),
          method: context.req.method,
          url: context.req.path,
        },
      }),
      // Probes at info level would bury real traffic. debug keeps them
      // available when you are actually debugging a probe.
      onResLevel: (context) => {
        if (isProbe(context.req.path)) {
          return LOG_LEVEL.DEBUG;
        }
        if (context.res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
          return LOG_LEVEL.ERROR;
        }
        return context.res.status >= HTTP_STATUS.BAD_REQUEST
          ? LOG_LEVEL.WARN
          : LOG_LEVEL.INFO;
      },
    },
    pino: logger,
  });
