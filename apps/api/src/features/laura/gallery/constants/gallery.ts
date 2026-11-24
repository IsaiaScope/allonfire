/** The Gallery: the Images placed in Laura, newest first, for a Laura User. */
export const LAURA_GALLERY = {
  DOC: {
    GET_200: "One page of Laura's Images and where the next one starts",
    GET_DESCRIPTION:
      "The Images placed in Laura, newest first, a page at a time. `favorite` is true when the Image is in the caller's own Favorites. Page with `cursor`, the `nextCursor` of the page before; null on the last page. Laura Members only.",
    GET_SUMMARY: "List the Gallery",
  },
  LIMIT: { DEFAULT: 24, MAX: 48 },
  OPENAPI_TAG: "Gallery",
  PATH: { BASE: "/gallery" },
} as const;
