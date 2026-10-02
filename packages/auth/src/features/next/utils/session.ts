import { visitorHeaders } from "@allonfire/utils/next/api/forwarded-for";
import { cookies, headers } from "next/headers";
import { canAccess } from "./access";
import { createApiAuthClient, type Session } from "./auth-client";

/**
 * The visitor's Session, read from the API with the browser's cookies; `null`
 * when signed out or the API cannot say. The App's proxy has already renewed
 * the cookies (`refreshSession`), so a renewal the API sends here is a repeat.
 */
export const getSession = async (): Promise<Session | null> => {
  const cookie = (await cookies()).toString();
  if (!cookie) {
    return null;
  }
  try {
    const { data } = await createApiAuthClient().getSession({
      fetchOptions: { headers: visitorHeaders(cookie, await headers()) },
    });
    return data;
  } catch {
    return null;
  }
};

/** The Session of someone this App lets in, or `null` for anyone else. */
export const getAppSession = async () => {
  const session = await getSession();
  return session && canAccess(session.user) ? session : null;
};
