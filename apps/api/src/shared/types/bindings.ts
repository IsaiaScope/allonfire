import type { AuthVariables } from "@allonfire/auth/features/hono/types/variables";
import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import type { PinoLogger } from "hono-pino";
import type { CONTEXT_VAR } from "../constants/runtime";

export type AppBindings = {
  /** `AuthVariables` adds the Session `sessionLoader` sets. */
  Variables: AuthVariables & {
    [CONTEXT_VAR.REQUEST_ID]: string;
    /** `hono-pino` puts its own wrapper here, not the bare pino logger. */
    [CONTEXT_VAR.LOGGER]: PinoLogger;
    /** Set by `localeResolver`; every error message is rendered in it. */
    [CONTEXT_VAR.LOCALE]: Locale;
  };
};
