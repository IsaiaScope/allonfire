import { cookies } from "next/headers";
import { AUTH } from "../../../shared/constants/auth";

/**
 * The visitor's Session token cookie alone, as a `Cookie` header, or `""`
 * signed out. Enough for the API to know them, and the same for the whole
 * Session: a cache keyed on it keeps one entry per Session, where the full
 * cookie string changes whenever the proxy renews the cookie cache.
 */
export const readSessionCookie = async (): Promise<string> => {
  const token = (await cookies())
    .getAll()
    .find(({ name }) => name.endsWith(AUTH.COOKIE.SESSION_TOKEN));
  return token ? `${token.name}=${token.value}` : "";
};
