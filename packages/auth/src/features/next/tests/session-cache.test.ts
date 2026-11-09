// @module-tag unit
import { getSession } from "../utils/session";

vi.mock("next/headers", () => import("./session-request-mocks"));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock(
  "@allonfire/core/features/next/api/visitor-headers",
  () => import("./session-request-mocks")
);
// React's cache memoizes only inside a server request; this one memoizes for
// the whole file, so a second read proves getSession goes through it.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    cache: <Args extends unknown[], Result>(
      read: (...args: Args) => Result
    ) => {
      let memo: { result: Result } | undefined;
      return (...args: Args) => {
        memo ??= { result: read(...args) };
        return memo.result;
      };
    },
  };
});

describe("getSession", () => {
  it("asks the API once per request, however many parts read the Session", async () => {
    const fetch = vi.fn(async () => Response.json(null));
    vi.stubGlobal("fetch", fetch);
    await getSession();
    await getSession();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
