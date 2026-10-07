import { readVisitorHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import { SECURE_COOKIE_PREFIX } from "better-auth/cookies";
import { cookies } from "next/headers";
import { AUTH_COOKIE_MARKER } from "../constants/api";
import { createApiAuthClient } from "./auth-client";
import { parseSetCookies } from "./set-cookie";

/**
 * Ends the Session on the API and clears Better Auth's cookies on the App's
 * response whatever the API answered, for an App's server action. The API's
 * answer expires each cookie with the Domain and Secure it was set with; a
 * cookie it did not expire (the API was down) is expired here, Secure when its
 * name says `__Secure-`, which a browser requires to replace it.
 */
export const signOutOfApi = async () => {
  let expiredByApi: string[] = [];
  await createApiAuthClient()
    .signOut({
      fetchOptions: {
        headers: await readVisitorHeaders(),
        onResponse: ({ response }) => {
          expiredByApi = response.headers.getSetCookie();
        },
      },
    })
    .catch(() => undefined);
  const jar = await cookies();
  const expired = new Set<string>();
  for (const { name, value, options } of parseSetCookies(expiredByApi)) {
    jar.set(name, value, options);
    expired.add(name);
  }
  for (const { name } of jar.getAll()) {
    if (name.includes(AUTH_COOKIE_MARKER) && !expired.has(name)) {
      jar.delete({
        name,
        path: "/",
        secure: name.startsWith(SECURE_COOKIE_PREFIX),
      });
    }
  }
};
