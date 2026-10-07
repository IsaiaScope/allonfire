import { cookies, headers } from "next/headers";
import { HTTP_HEADER } from "../../http/constants/http";

/**
 * The visitor's address chain as it reached this server, to pass on to the
 * API so its per-IP limits count the visitor rather than this server. The
 * API reads it only when API_TRUSTED_PROXY_HOPS says a proxy wrote it.
 */
export const forwardedFor = (incoming: Headers): Record<string, string> => {
  const chain = incoming.get(HTTP_HEADER.X_FORWARDED_FOR);
  return chain ? { [HTTP_HEADER.X_FORWARDED_FOR]: chain } : {};
};

/** What the App's server sends the API as the visitor: their cookies and address. */
export const visitorHeaders = (
  cookie: string,
  incoming: Headers
): Record<string, string> => ({
  [HTTP_HEADER.COOKIE]: cookie,
  ...forwardedFor(incoming),
});

/**
 * The visitor's headers read from the request this server is answering, for a
 * Server Component, server action or route handler calling the API. The
 * proxy, which has a `NextRequest` instead, calls `visitorHeaders`.
 */
export const readVisitorHeaders = async (): Promise<Record<string, string>> =>
  visitorHeaders((await cookies()).toString(), await headers());
