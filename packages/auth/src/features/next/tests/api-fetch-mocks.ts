import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";

/** Made up, no real code: the answer to a refusal whose code the App ignores. */
const OTHER_CODE = "NOT_A_REAL_CODE";

/** The API refusing with `status` and Better Auth's error body. */
export const refusedWith = (status: number, code = OTHER_CODE) =>
  new Response(stringifyJson({ code, message: "no" }), {
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    status,
  });

/** The API's `fetch`, answering `{}` unless a test says otherwise. */
export const fetchMock = vi.fn(
  async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response("{}", {
      headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    })
);

/** The request fetch made, as a `Request`. */
export const call = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index] ?? [];
  if (url === undefined) {
    throw new Error(`no fetch call ${index}`);
  }
  return new Request(url, init);
};

/** Puts `fetchMock` in place of the global `fetch`, its calls forgotten. */
export const stubFetch = () => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
};
