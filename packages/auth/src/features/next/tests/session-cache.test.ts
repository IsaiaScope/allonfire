// @module-tag unit
import { getSession } from "../utils/session";

const COOKIE = "better-auth.session_token=token";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => COOKIE }),
  headers: async () => new Headers({ cookie: COOKIE }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
// Core may resolve its own copy of `next`, which the mock above never
// reaches; the visitor's headers come from here instead.
vi.mock("@allonfire/core/features/next/api/forwarded-for", () => ({
  readVisitorHeaders: async () => ({ cookie: COOKIE }),
}));
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
