// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { cacheLife } from "next/cache";
import { AUTH } from "../../../shared/constants/auth";
import { requireAppSession } from "../utils/session";

const COOKIE = "better-auth.session_token=token";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => COOKIE }),
  headers: async () => new Headers({ cookie: COOKIE }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "it" }));
// Core may resolve its own copy of `next`, which the mock above never
// reaches; the visitor's headers come from here instead.
vi.mock("@allonfire/core/features/next/api/forwarded-for", () => ({
  readVisitorHeaders: async () => ({ cookie: COOKIE }),
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

/** The API answers `get-session` with a User holding these Memberships. */
const apiSends = (memberships: { app: App; role: Role }[] | null) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        memberships && {
          session: { id: "session-1" },
          user: { email: "someone@example.com", memberships },
        }
      )
    )
  );

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
