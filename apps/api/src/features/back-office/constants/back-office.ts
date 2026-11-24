import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { BACK_OFFICE_OVERVIEW } from "../overview/constants/overview";

const SEGMENT = ACCESS.APP_SETTINGS[App.BACK_OFFICE].slug;

/** The admin console (ADR 0035): routes only Back Office Admins call. */
export const BACK_OFFICE = {
  /** The docs group the console's tags (Users, Overview) under this name. */
  OPENAPI_GROUP: "Back Office",
  /** The two overviews, the Users' and the Storage's. */
  OVERVIEW: BACK_OFFICE_OVERVIEW,
  PATH: { BASE: `/${SEGMENT}` },
  /** The key under `client.v1`, and the App's folder under `apps/`. */
  SEGMENT,
} as const;
