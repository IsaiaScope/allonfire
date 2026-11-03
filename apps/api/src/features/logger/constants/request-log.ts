import { HTTP } from "@allonfire/core/features/http/constants/http";

/** What the request log records of each request. */
export const REQUEST_LOG = {
  /**
   * The only request headers the request log records. An allowlist, not a
   * denylist: request lines ship to OpenObserve, and a header added later
   * should have to earn its place.
   */
  HEADERS: [
    HTTP.HEADER.ACCEPT_LANGUAGE,
    HTTP.HEADER.CONTENT_LENGTH,
    HTTP.HEADER.CONTENT_TYPE,
  ],
} as const;
