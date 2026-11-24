import { OVERVIEW_STORAGE } from "../storage/constants/storage";
import { OVERVIEW_USERS } from "../users/constants/users";

/** The two overviews, the Users' and the Storage's, under one prefix of the admin console. */
export const BACK_OFFICE_OVERVIEW = {
  OPENAPI_TAG: "Overview",
  PATH: { BASE: "/overview" },
  /** The Storage overview's constants. */
  STORAGE: OVERVIEW_STORAGE,
  /** The Users overview's constants. */
  USERS: OVERVIEW_USERS,
} as const;
