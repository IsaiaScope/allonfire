import { QUERY } from "./query";

/** The Back Office's TanStack mutation keys, beside the queries they change. */
export const MUTATION = {
  IMAGES: { DELETE: [...QUERY.IMAGES.ALL, "delete"] },
  USERS: { DELETE: [...QUERY.USERS.ALL, "delete"] },
} as const;
