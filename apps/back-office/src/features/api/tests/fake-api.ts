import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { hc } from "hono/client";

/**
 * A request the action sent: its method, path and body, JSON as sent or a
 * form's text fields.
 */
type Sent = { body: unknown; method: string; path: string };

/**
 * How the API answers a method: its status, and a problem's code or the
 * JSON body it answers, if any.
 */
type Answer = { status: number; code?: string; body?: object };

/** A form's text fields; its files left out. */
const textFieldsOf = async (request: Request) =>
  objectFromEntries(
    [...(await request.formData()).entries()].flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as const] : []
    )
  );

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
  const type = request.headers.get(HTTP.HEADER.CONTENT_TYPE) ?? "";
  const bodyOf = () => {
    if (type.startsWith(HTTP.CONTENT_TYPE.JSON)) {
      return request.json();
    }
    if (type.startsWith(HTTP.CONTENT_TYPE.MULTIPART_FORM_DATA)) {
      return textFieldsOf(request);
    }
    return null;
  };
  FAKE_API.sent.push({
    body: await bodyOf(),
    method: request.method,
    path: new URL(request.url).pathname,
  });
  if (FAKE_API.unreachable.has(request.method)) {
    throw new TypeError("fetch failed");
  }
  const { body, code, status } = FAKE_API.answers.get(request.method) ?? {
    status:
      request.method === HTTP.METHOD.DELETE
        ? HTTP.STATUS.NO_CONTENT
        : HTTP.STATUS.OK,
  };
  if (status === HTTP.STATUS.NO_CONTENT) {
    return new Response(null, { status });
  }
  return Response.json(code ? { code } : (body ?? {}), { status });
};

/**
 * `serverApi`'s stand-in: the typed client over the fake.
 * `vi.mock("@/features/api/utils/server-api", () => import("@/features/api/tests/fake-api"))`.
 */
export const serverApi = () =>
  Promise.resolve(hc<ApiType>(LOCAL.URL.TEST_API, { fetch: fakeFetch }));
