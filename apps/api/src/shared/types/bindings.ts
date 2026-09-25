import type { AuthVariables } from "@allonfire/auth/shared/types/variables";
import type { PinoLogger } from "hono-pino";
import type { Locale } from "../../features/i18n/constants/locales";
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
