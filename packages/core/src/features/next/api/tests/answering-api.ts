import type { ClientRequestOptions } from "hono/client";

/**
 * A typed API client (`create`, the App's `hc<ApiType>`) whose fetch answers
 * `body` as JSON and records the URL it was asked: for a test of what a read
 * sends. The App's own `tests/` binds `create` and the address.
 * @internal Read by the Apps' tests only, which production knip does not read.
 */
export const answeringApi = <Client>(
  create: (url: string, options: ClientRequestOptions) => Client,
  url: string,
  body: unknown
) => {
  const seen: URL[] = [];
  const client = create(url, {
    fetch: (input: RequestInfo | URL) => {
      seen.push(new URL(new Request(input).url));
      return Promise.resolve(Response.json(body));
    },
  });
  return { client, seen };
};
