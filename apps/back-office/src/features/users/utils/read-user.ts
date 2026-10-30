import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";
import { sessionApi } from "@/features/api/utils/server-api";
import { fetchUser } from "./users-queries";

/**
 * One User as the Session (`sessionCookie`) sees them, read afresh on every request, never
 * kept: the Edit form is seeded from it and saves every Membership it
 * shows, so a copy missing one gained elsewhere (a User joining an App,
 * which no Back Office save sees) would delete it. Null for an unknown id;
 * any other refusal is thrown.
 */
export const readUser = async (sessionCookie: string, id: string) => {
  try {
    return await fetchUser(sessionApi(sessionCookie), id);
  } catch (error) {
    if (
      error instanceof DetailedError &&
      error.statusCode === HTTP.STATUS.NOT_FOUND
    ) {
      return null;
    }
    throw error;
  }
};
