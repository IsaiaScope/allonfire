const LEADING_DOT = /^\./;
const DOMAIN_ATTRIBUTE = /;\s*Domain=[^;]*/i;

/**
 * Whether a cookie set for `domain` would be dropped by a browser for a
 * request from `origin`: a domain is set and the Origin is a URL that is
 * neither that domain nor under it. A request with no Origin, or one that is
 * not a URL, is not outside: nothing says it comes from elsewhere.
 */
export const isOutsideDomain = (
  origin: string | undefined,
  domain: string | undefined
): boolean => {
  const hostname =
    origin === undefined ? undefined : URL.parse(origin)?.hostname;
  if (domain === undefined || hostname === undefined) {
    return false;
  }
  const bare = domain.replace(LEADING_DOT, "");
  return hostname !== bare && !hostname.endsWith(`.${bare}`);
};

/**
 * The Domain a Session cookie is set for on a request from `origin`: the
 * host's `domain`, none when the Origin is outside it (the cookie then goes
 * without one and belongs to the host that answered). Only ever narrows a
 * cookie, never widens it.
 */
export const cookieDomainFor = (
  origin: string | undefined,
  domain: string | undefined
): string | undefined => (isOutsideDomain(origin, domain) ? undefined : domain);

/** One `Set-Cookie` header without its `Domain` attribute. */
export const withoutDomain = (setCookie: string): string =>
  setCookie.replace(DOMAIN_ATTRIBUTE, "");

/**
 * One `Set-Cookie` header as it goes to a request from `origin`: without its
 * `Domain` when the Origin is outside the host's `domain`, as it is otherwise.
 */
export const setCookieFor = (
  setCookie: string,
  origin: string | undefined,
  domain: string | undefined
): string =>
  isOutsideDomain(origin, domain) ? withoutDomain(setCookie) : setCookie;
