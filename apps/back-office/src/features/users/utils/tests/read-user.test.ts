// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { cacheLife, cacheTag } from "next/cache";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { USERS } from "../../constants/users";
import { readUser } from "../read-user";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
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
