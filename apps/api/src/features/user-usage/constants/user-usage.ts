/** The Users overview: how many Users there are, for Back Office Admins. */
export const USER_USAGE = {
  DOC: {
    OVERVIEW_200: "The Users, and each App's members and Admins",
    OVERVIEW_DESCRIPTION:
      "How many Users there are (one in no App included) and, for each App that has any, how many are members and how many of them are Admins there; a User in two Apps counts in both. Back Office Admins only.",
    OVERVIEW_SUMMARY: "Read the Users overview",
  },
  OPENAPI_TAG: "Users",
  PATH: { BASE: "/user-usage", OVERVIEW: "/overview" },
} as const;
