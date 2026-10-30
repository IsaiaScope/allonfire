const USERS = "users";

/**
 * The Back Office's TanStack Query keys, every feature's in one place: a
 * page that prefetches on the server and the component that reads it back
 * share a key only when both build it here.
 */
export const QUERY = {
  USERS: {
    /** The prefix every Users key starts with: what a deletion refreshes. */
    ALL: [USERS],
    /** One page of the list, keyed by the address that asked for it. */
    LIST: <P>(params: P) => [USERS, "list", params] as const,
  },
} as const;
