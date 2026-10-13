import type { AuthVariables } from "@allonfire/auth/features/hono/types/variables";
import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import type { PinoLogger } from "hono-pino";
import type { API } from "../constants/api";

export type AppBindings = {
  /** `AuthVariables` adds the Session `sessionLoader` sets. */
  Variables: AuthVariables & {
    [API.CONTEXT_VAR.REQUEST_ID]: string;
    /** `hono-pino` puts its own wrapper here, not the bare pino logger. */
    [API.CONTEXT_VAR.LOGGER]: PinoLogger;
    /** Set by `localeResolver`; every error message is rendered in it. */
    [API.CONTEXT_VAR.LOCALE]: Locale;
  };
};
