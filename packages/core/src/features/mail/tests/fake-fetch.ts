import { type Json, stringifyJson } from "../../../shared/utils/json";

/** One request a driver made, as a test reads it. */
type SeenRequest = {
  url: URL;
  method: string;
  headers: Headers;
  body: string | undefined;
};

type Answer = Response | Error | ((request: SeenRequest) => Response | Error);

/**
 * A `fetch` for a test: every call is recorded and answered by `answer` (one
 * for all, or one per call in order). An `Error` answer is thrown.
 */
export const fakeFetch = (...answers: Answer[]) => {
  const seen: SeenRequest[] = [];
  let next = 0;
  const run: typeof fetch = (input, init) => {
    const request: SeenRequest = {
      body: typeof init?.body === "string" ? init.body : undefined,
      headers: new Headers(init?.headers),
      method: init?.method ?? "GET",
      url: new URL(String(input)),
    };
    seen.push(request);
    const answer = answers[Math.min(next, answers.length - 1)];
    next += 1;
    if (!answer) {
      return Promise.reject(new Error("fakeFetch needs an answer"));
    }
    const result = typeof answer === "function" ? answer(request) : answer;
    return result instanceof Error
      ? Promise.reject(result)
      : Promise.resolve(result.clone());
  };
  return { fetch: run, seen };
};

export const jsonResponse = <T>(body: T & Json<T>, status = 200) =>
  new Response(stringifyJson(body), {
    headers: { "content-type": "application/json" },
    status,
  });
