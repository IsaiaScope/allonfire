const IMAGES = "images";
const USERS = "users";
const SERVICES = "services";
const STORAGE = "storage";

/**
 * The Back Office's TanStack Query keys, every feature's in one place: a
 * page that prefetches on the server and the component that reads it back
 * share a key only when both build it here.
 */
export const QUERY = {
  IMAGES: {
    /** The prefix every Images key starts with: what a change refreshes. */
    ALL: [IMAGES],
    /** One page of the list, keyed by the address that asked for it. */
    LIST: <P>(params: P) => [IMAGES, "list", params] as const,
    /** One Image, by its id: what its edit page reads. */
    ONE: (id: string) => [IMAGES, "one", id] as const,
  },
  SERVICES: {
    /** The prefix every Services key starts with: what any Services change refreshes. */
    ALL: [SERVICES],
    /** One Service type and its providers. */
    LIST: <T extends string>(type: T) => [SERVICES, "list", type] as const,
  },
  STORAGE: {
    /** The prefix every Storage key starts with: what an Image change refreshes. */
    ALL: [STORAGE],
    /** The Storage overview on Home. */
    OVERVIEW: [STORAGE, "overview"] as const,
  },
  USERS: {
    /** The prefix every Users key starts with: what a deletion refreshes. */
    ALL: [USERS],
    /** One page of the list, keyed by the address that asked for it. */
    LIST: <P>(params: P) => [USERS, "list", params] as const,
    /** One User, by their id: what their edit page reads. */
    ONE: (id: string) => [USERS, "one", id] as const,
    /** The Users overview on Home; under `ALL`, so a User change refreshes it too. */
    OVERVIEW: [USERS, "overview"] as const,
  },
} as const;
