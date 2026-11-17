import type { ServiceType } from "@allonfire/database/enums";
import { QUERY } from "./query";

/** The Back Office's TanStack mutation keys, beside the queries they change. */
export const MUTATION = {
  IMAGES: { DELETE: [...QUERY.IMAGES.ALL, "delete"] },
  SERVICES: {
    /** Turning one Service type on or off; under `ALL`, so a Services change refreshes it too. */
    ENABLED: (type: ServiceType) =>
      [...QUERY.SERVICES.ALL, "enabled", type] as const,
  },
  USERS: { DELETE: [...QUERY.USERS.ALL, "delete"] },
} as const;
