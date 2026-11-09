/** A Hono route param: `:id` in `/users/:id`. */
const PARAM = /:(\w+)/g;

/**
 * A Hono route path with its params filled: `fillPath(USER.PATH.ONE, { id })`.
 * Each value is URI-encoded, so it stays one path segment; a param the path
 * names but `params` leaves out throws instead of reaching the server as `:id`.
 * @internal
 */
export const fillPath = (
  path: string,
  params: Readonly<Record<string, string>>
) =>
  path.replaceAll(PARAM, (param, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`fillPath: no value for ${param} in ${path}`);
    }
    return encodeURIComponent(value);
  });

/**
 * A Hono route path as the OpenAPI spec writes it: `/users/:id` → `/users/{id}`.
 * @internal
 */
export const openApiPath = (path: string) => path.replaceAll(PARAM, "{$1}");
