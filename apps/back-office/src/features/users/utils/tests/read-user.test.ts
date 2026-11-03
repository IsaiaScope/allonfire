// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { cacheLife, cacheTag } from "next/cache";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { USERS } from "../../constants/users";
import { readUser } from "../read-user";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// The App's env is read at import, which a unit test lacks.
vi.mock("@/environment/environment", () => ({
  env: { API_URL: LOCAL.URL.TEST_API },
}));
vi.mock("@allonfire/auth/features/next/utils/session-cookie", () => ({
  readSessionCookie: vi.fn(async () => COOKIE),
}));

const COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;
const [USER] = USERS_PAGE.users;
const ID = USER?.id ?? "";

describe("readUser", () => {
  it("reads the User as the Session's cookie, tagged under the list's tag, kept 5 minutes", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(USER)
    );
    vi.stubGlobal("fetch", fetch);
    expect(await readUser(ID)).toEqual(USER);
    expect(cacheTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(USERS.CACHE.LIFE);
    const [, init] = fetch.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get(HTTP.HEADER.COOKIE)).toBe(COOKIE);
  });

  it("answers null for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: HTTP.STATUS.NOT_FOUND }))
    );
    expect(await readUser("missing")).toBeNull();
  });

  it("throws any other refusal, so nothing is kept", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: HTTP.STATUS.FORBIDDEN }))
    );
    await expect(readUser(ID)).rejects.toThrow();
  });
});
