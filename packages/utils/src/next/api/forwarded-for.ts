import { HTTP_HEADER } from "../../constants/http";

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
