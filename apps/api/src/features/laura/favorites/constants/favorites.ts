import { HTTP } from "@allonfire/core/features/http/constants/http";

/** The Favorites: the Images the Laura Admins marked, in each User's own data. */
export const LAURA_FAVORITES = {
  DOC: {
    DELETE: {
      DESCRIPTION:
        "Clears a Favorite for every Laura User. An Image that is not a Favorite, or does not exist, is no error. Laura Admins only.",
      RESPONSE: { [HTTP.STATUS.OK]: "The Image is not a Favorite" },
      SUMMARY: "Clear a Favorite",
    },
    GET: {
      DESCRIPTION:
        "The caller's own Favorites, the most recently marked first, a page at a time. Every Laura User reads the same list, copied into their own data the first time they read Laura. Page with `cursor`, the `nextCursor` of the page before; null on the last page. Laura Members only.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "One page of the caller's Favorites and where the next one starts",
      },
      SUMMARY: "List the Favorites",
    },
    PUT: {
      DESCRIPTION:
        "Marks an Image placed in Laura as a Favorite for every Laura User: the Admins' one list, copied into each User's own data. Marking again changes nothing. Laura Admins only; 404 when the Image is not placed in Laura.",
      RESPONSE: { [HTTP.STATUS.OK]: "The Image is a Favorite" },
      SUMMARY: "Mark a Favorite",
    },
  },
  OPENAPI_TAG: "Favorites",
  PATH: { BASE: "/favorites", ONE: "/:imageId" },
} as const;
