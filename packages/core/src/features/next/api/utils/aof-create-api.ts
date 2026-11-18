import type { ClientRequestOptions } from "hono/client";
import { apiUrlFor } from "./api-url";

/**
 * The API's typed client for the browser (ADR 0004). The App hands over how
 * its client is made, `create` (its `hc<ApiType>`: only the App knows the API
 * type, and core cannot name it), and the addresses: the public one (`local`,
 * or `remote` for a page opened off this machine, Local only: `apiUrlFor`),
 * called with the Session cookies. In a query, read the body with
 * `parseResponse` from `hono/client`, which throws a `DetailedError` TanStack
 * Query expects. Apart from `aofCreateServerApi` on purpose: a file the
 * browser imports must not reach `next/headers` or a server-only environment
 * variable.
 */
export const aofCreateApi = <Client>({
  create,
  local,
  remote,
}: {
  create: (url: string, options: ClientRequestOptions) => Client;
  local: string;
  remote: string | undefined;
}) =>
  create(apiUrlFor(globalThis.location?.hostname, { local, remote }), {
    init: { credentials: "include" },
  });
