import type { ClientRequestOptions } from "hono/client";
import { HTTP } from "../../../http/constants/http";
import { readVisitorHeaders } from "./visitor-headers";

/**
 * The API's typed client for an App's server, at the API's internal address
 * `url()`, read at each call (a server-only environment variable must not be
 * read when a client module merely imports this file, as a browser test
 * does). The App hands over how its client is made, `create` (its
 * `hc<ApiType>`), as for the browser's `aofCreateApi`:
 * - `serverApi()`: as the visitor (their cookies, address and Origin), for a
 *   Server Component that reads before it renders.
 * - `sessionApi(cookie)`: as the Session `cookie` names (from
 *   `readSessionCookie`) and nothing else of the visitor, what a `"use cache"`
 *   read can take, since it reads no request headers itself.
 * Read the body with `parseResponse`, as with the browser's `api`.
 */
export const aofCreateServerApi = <Client>({
  create,
  url,
}: {
  create: (url: string, options: ClientRequestOptions) => Client;
  url: () => string;
}) => ({
  serverApi: async () => create(url(), { headers: await readVisitorHeaders() }),
  sessionApi: (sessionCookie: string) =>
    create(url(), { headers: { [HTTP.HEADER.COOKIE]: sessionCookie } }),
});
