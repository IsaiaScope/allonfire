import { cookies, headers } from "next/headers";
import { objectFromEntries } from "../../../shared/utils/object";
import { HTTP_HEADER } from "../../http/constants/http";

/** What a visitor's request carries that the API must see as theirs. */
const FORWARDED = [HTTP_HEADER.ORIGIN, HTTP_HEADER.X_FORWARDED_FOR] as const;

/**
 * The visitor's headers to pass on to the API, as they reached this server:
 * the page's Origin, which Better Auth checks against its trusted origins
 * before a sign in or sign out (a call without one is refused), and the
 * address chain, so the API's per-IP limits count the visitor rather than
 * this server; the API reads that only when API_TRUSTED_PROXY_HOPS says a
 * proxy wrote it.
 */
export const forwardedHeaders = (incoming: Headers): Record<string, string> =>
  objectFromEntries(
    FORWARDED.flatMap((name) => {
      const value = incoming.get(name);
      return value ? [[name, value] as const] : [];
    })
  );

/** What the App's server sends the API as the visitor: their cookies, address and Origin. */
export const visitorHeaders = (
  cookie: string,
  incoming: Headers
): Record<string, string> => ({
  [HTTP_HEADER.COOKIE]: cookie,
  ...forwardedHeaders(incoming),
});

/**
 * The visitor's headers read from the request this server is answering, for a
 * Server Component, server action or route handler calling the API. The
 * proxy, which has a `NextRequest` instead, calls `visitorHeaders`.
 */
export const readVisitorHeaders = async (): Promise<Record<string, string>> =>
  visitorHeaders((await cookies()).toString(), await headers());
