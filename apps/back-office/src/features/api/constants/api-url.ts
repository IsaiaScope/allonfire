/** Where the browser's API address is chosen (`apiUrlFor`). */
export const API_URL = {
  /** A page on one of these hosts is on this machine: it calls the local API. */
  LOCAL_HOSTS: ["localhost", "127.0.0.1", "[::1]"],
} as const;
