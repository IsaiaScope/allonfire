import { HTTP } from "@allonfire/core/features/http/constants/http";

/** The Users overview: how many Users there are, for Back Office Admins. */
export const OVERVIEW_USERS = {
  DOC: {
    OVERVIEW: {
      DESCRIPTION:
        "How many Users there are (one in no App included) and, for each App that has any, how many are members and how many of them are Admins there; a User in two Apps counts in both. Back Office Admins only.",
      RESPONSE: {
        [HTTP.STATUS.OK]: "The Users, and each App's members and Admins",
      },
      SUMMARY: "Read the Users overview",
    },
  },
  PATH: { BASE: "/users" },
} as const;
