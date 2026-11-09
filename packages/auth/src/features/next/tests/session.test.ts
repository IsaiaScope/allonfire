// @module-tag unit
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { App, Role } from "@allonfire/database/enums";
import { cacheLife } from "next/cache";
import { AUTH } from "../../../shared/constants/auth";
import { getSession, requireAppSession } from "../utils/session";
import { apiSends } from "./session-request-mocks";

vi.mock("next/headers", () => import("./session-request-mocks"));
vi.mock("next-intl/server", () => ({ getLocale: async () => "it" }));
vi.mock(
  "@allonfire/core/features/next/api/visitor-headers",
  () => import("./session-request-mocks")
);
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

describe("requireAppSession", () => {
  it("hands the page the Session of someone this App lets in", async () => {
    apiSends([{ app: App.BACK_OFFICE, role: Role.ADMIN }]);
    expect((await requireAppSession()).user.email).toBe("someone@example.com");
  });

  it("is kept in the browser for the page check's stale time", async () => {
    apiSends([{ app: App.BACK_OFFICE, role: Role.ADMIN }]);
    await requireAppSession();
    expect(cacheLife).toHaveBeenCalledWith({
      stale: AUTH.SESSION.PAGE_CHECK_STALE_S,
    });
  });

  it("sends someone this App refuses to Sign in", async () => {
    apiSends([{ app: App.LAURA, role: Role.ADMIN }]);
    await expect(requireAppSession()).rejects.toThrow(
      `redirect /it${AUTH.PAGE.SIGN_IN}`
    );
  });

  it("sends a visitor the API knows nothing of to Sign in", async () => {
    apiSends(null);
    await expect(requireAppSession()).rejects.toThrow(
      `redirect /it${AUTH.PAGE.SIGN_IN}`
    );
  });
});

describe("getSession", () => {
  it("returns null and logs the error when the API call rejects", async () => {
    const failure = new Error("API down");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(failure))
    );
    const error = vi
      .spyOn(serverLogger(), "error")
      .mockImplementation(() => undefined);

    expect(await getSession()).toBeNull();
    expect(error).toHaveBeenCalledWith(
      { err: failure },
      AUTH.LOG_MESSAGE.SESSION_READ_FAILED
    );
  });
});
