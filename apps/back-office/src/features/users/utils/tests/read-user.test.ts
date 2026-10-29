// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { cacheLife, cacheTag } from "next/cache";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { readUser } from "../read-user";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// The App's env is read at import, which a unit test lacks.
vi.mock("@/environment/environment", () => ({
  env: { API_URL: TEST_API_URL },
}));

const COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;
const [USER] = USERS_PAGE.users;

describe("readUser", () => {
  it("reads the User as the Session, afresh: never kept", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(USER)
    );
    vi.stubGlobal("fetch", fetch);
    expect(await readUser(COOKIE, USER?.id ?? "")).toEqual(USER);
    // A kept copy can miss a Membership gained elsewhere (joining an App):
    // the form seeded from it would delete that Membership on Save.
    expect(cacheTag).not.toHaveBeenCalled();
    expect(cacheLife).not.toHaveBeenCalled();
    const [, init] = fetch.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get(HTTP.HEADER.COOKIE)).toBe(COOKIE);
  });

  it("answers null for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: HTTP.STATUS.NOT_FOUND }))
    );
    expect(await readUser(COOKIE, "missing")).toBeNull();
  });

  it("throws any other refusal, so nothing is kept", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: HTTP.STATUS.FORBIDDEN }))
    );
    await expect(readUser(COOKIE, "user-2")).rejects.toThrow();
  });
});
