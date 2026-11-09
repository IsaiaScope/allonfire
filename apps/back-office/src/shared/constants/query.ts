const USERS = "users";
const SERVICES = "services";

/**
 * The Back Office's TanStack Query keys, every feature's in one place: a
 * page that prefetches on the server and the component that reads it back
 * share a key only when both build it here.
 */
export const QUERY = {
  SERVICES: {
    /** The prefix every Services key starts with: what any Services change refreshes. */
    ALL: [SERVICES],
    /** One Service type and its providers. */
    LIST: <T extends string>(type: T) => [SERVICES, "list", type] as const,
  },
  USERS: {
    /** The prefix every Users key starts with: what a deletion refreshes. */
    ALL: [USERS],
    /** One page of the list, keyed by the address that asked for it. */
    LIST: <P>(params: P) => [USERS, "list", params] as const,
  },
} as const;
