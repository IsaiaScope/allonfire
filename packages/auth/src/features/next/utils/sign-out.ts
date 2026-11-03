import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { readVisitorHeaders } from "@allonfire/core/features/next/api/visitor-headers";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { SECURE_COOKIE_PREFIX } from "better-auth/cookies";
import { cookies } from "next/headers";
import { nextAuthEnv } from "../../../environment/next-environment";
import { AUTH } from "../../../shared/constants/auth";
import { createApiAuthClient } from "./auth-client";
import { adoptSetCookies } from "./set-cookie";

/**
 * Ends the Session on the API and clears Better Auth's cookies on the App's
 * response whatever the API answered, for an App's server action. The API's
 * answer expires each cookie with the Domain and Secure it was set with; a
 * cookie it did not expire (the API was down) is expired here with what a
 * browser requires to drop it: Secure when its name says `__Secure-`, and the
 * Domain the App is told the API sets (`AUTH_COOKIE_DOMAIN`). The Session
 * itself then lives on in the database until the API ends it or it expires.
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
    .catch((err: unknown) =>
      serverLogger().error({ err }, AUTH.LOG_MESSAGE.SIGN_OUT_FAILED)
    );
  const jar = await cookies();
  const expired = new Set(adoptSetCookies(jar, expiredByApi));
  for (const { name } of jar.getAll()) {
    if (name.includes(AUTH.COOKIE.MARKER) && !expired.has(name)) {
      jar.delete({
        domain: nextAuthEnv.AUTH_COOKIE_DOMAIN,
        name,
        path: METADATA.PATH.ROOT,
        secure: name.startsWith(SECURE_COOKIE_PREFIX),
      });
    }
  }
};
