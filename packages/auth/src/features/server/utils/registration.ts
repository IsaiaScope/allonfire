import type { App } from "@allonfire/database/enums";
import {
  APP_SETTINGS,
  type AppSettingsTable,
  type RegistrationRole,
} from "@allonfire/database/features/auth/access/constants/app-settings";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { APIError } from "better-auth/api";
import { AUTH_ERROR_CODE } from "../../../shared/constants/errors";
import { APP_HEADER } from "../../../shared/constants/headers";

/** The App a request registers in, and the Role Registration there gives. */
type Registration = { app: App; role: RegistrationRole };

/** The App `x-aof-app` names, if it names one. */
export const namedApp = (headers?: Headers): App | null => {
  const parsed = appSchema.safeParse(headers?.get(APP_HEADER));
  return parsed.success ? parsed.data : null;
};

/** What Registration in the named App gives; null when it names no open App. */
export const registrationFor = (headers?: Headers): Registration | null => {
  const settings: AppSettingsTable = APP_SETTINGS;
  const app = namedApp(headers);
  const role = app && settings[app].registration;
  return app && role ? { app, role } : null;
};

export const registrationClosed = () =>
  new APIError("FORBIDDEN", {
    code: AUTH_ERROR_CODE.REGISTRATION_CLOSED,
    message: "This App does not allow Registration",
  });
