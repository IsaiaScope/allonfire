import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { DehydratedState } from "@tanstack/react-query";

/**
 * Answers every `fetch` with `body` as JSON (200 unless a `status` is given)
 * and returns the stub, whose calls are what the read under test sent.
 */
export const stubFetchJson = (
  body: unknown,
  status: number = HTTP.STATUS.OK
) => {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    Response.json(body, { status })
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

/** The Cookie header the stub's first call sent. */
export const sentCookie = (fetch: ReturnType<typeof stubFetchJson>) => {
  const [, init] = fetch.mock.calls[0] ?? [];
  return new Headers(init?.headers).get(HTTP.HEADER.COOKIE);
};

/** What a dehydrated state holds: each query's key with its data. */
export const dehydratedData = ({ queries }: DehydratedState) =>
  queries.map(({ queryKey, state: { data } }) => ({ data, queryKey }));
