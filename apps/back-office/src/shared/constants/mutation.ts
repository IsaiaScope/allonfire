import { QUERY } from "./query";

/** The Back Office's TanStack mutation keys, beside the queries they change. */
export const MUTATION = {
  USERS: { DELETE: [...QUERY.USERS.ALL, "delete"] },
} as const;
