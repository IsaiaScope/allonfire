import type { ApiType } from "@allonfire/api/client";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { hc } from "hono/client";

/** A request the action sent: its method, path and JSON body. */
type Sent = { body: unknown; method: string; path: string };

/** How the API answers a method: its status, and a problem's code if any. */
type Answer = { status: number; code?: string };

/**
 * The API as an action's tests see it: every request recorded in `sent`,
 * each method answered by `answers` (200, or 204 for `DELETE`, when unset),
 * or never reached (`unreachable`), as when the network drops.
 */
const sent: Sent[] = [];

export const FAKE_API = {
  answers: new Map<string, Answer>(),
  sent,
  unreachable: new Set<string>(),
};

export const resetFakeApi = () => {
  FAKE_API.answers.clear();
  FAKE_API.sent.length = 0;
  FAKE_API.unreachable.clear();
};

const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init);
  const json = request.headers
    .get(HTTP.HEADER.CONTENT_TYPE)
    ?.startsWith(HTTP.CONTENT_TYPE.JSON);
  FAKE_API.sent.push({
    body: json ? await request.json() : null,
    method: request.method,
    path: new URL(request.url).pathname,
  });
  if (FAKE_API.unreachable.has(request.method)) {
    throw new TypeError("fetch failed");
  }
  const { code, status } = FAKE_API.answers.get(request.method) ?? {
    status:
      request.method === HTTP.METHOD.DELETE
        ? HTTP.STATUS.NO_CONTENT
        : HTTP.STATUS.OK,
  };
  if (status === HTTP.STATUS.NO_CONTENT) {
    return new Response(null, { status });
  }
  return Response.json(code ? { code } : {}, { status });
};

/** `serverApi`'s stand-in: the typed client over the fake. */
export const fakeServerApi = () =>
  Promise.resolve(hc<ApiType>(TEST_API_URL, { fetch: fakeFetch }));
