import { visitorHeaders } from "@allonfire/utils/next/api/forwarded-for";
import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_MARKER } from "../constants/api";
import { createApiAuthClient } from "./auth-client";

/**
 * Ends the Session on the API and clears Better Auth's cookies on the App's
 * response whatever the API answered, for an App's server action.
 */
export const signOutOfApi = async () => {
  const jar = await cookies();
  await createApiAuthClient()
    .signOut({
      fetchOptions: {
        headers: visitorHeaders(jar.toString(), await headers()),
      },
    })
    .catch(() => undefined);
  for (const { name } of jar.getAll()) {
    if (name.includes(AUTH_COOKIE_MARKER)) {
      jar.delete(name);
    }
  }
};
