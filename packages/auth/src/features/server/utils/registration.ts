import type { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import type {
  AppSettingsTable,
  RegistrationRole,
} from "@allonfire/database/features/auth/access/constants/app-settings";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { APIError } from "better-auth/api";
import { AUTH } from "../../../shared/constants/auth";

/** The App a request registers in, and the Role Registration there gives. */
type Registration = { app: App; role: RegistrationRole };

/** The App `x-aof-app` names, if it names one. */
export const namedApp = (headers?: Headers): App | null => {
  const parsed = appSchema.safeParse(headers?.get(AUTH.HEADER.APP));
  return parsed.success ? parsed.data : null;
};

/** What Registration in the named App gives; null when it names no open App. */
export const registrationFor = (headers?: Headers): Registration | null => {
  const settings: AppSettingsTable = ACCESS.APP_SETTINGS;
  const app = namedApp(headers);
  const role = app && settings[app].registration;
  return app && role ? { app, role } : null;
};

export const registrationClosed = () =>
  new APIError("FORBIDDEN", {
    code: AUTH.ERROR_CODE.REGISTRATION_CLOSED,
    message: "This App does not allow Registration",
  });
