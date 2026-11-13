// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { cacheLife, cacheTag } from "next/cache";
import { sentCookie, stubFetchJson } from "@/shared/tests/fetch-stub";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { SESSION_COOKIE } from "@/shared/tests/session-cookie-mock";
import { USERS } from "../../constants/users";
import { readUser } from "../read-user";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@/shared/tests/session-cookie-mock")
);

const [USER] = USERS_PAGE.users;
const ID = USER?.id ?? "";

describe("readUser", () => {
  it("reads the User as the Session's cookie, tagged under the list's tag, kept 5 minutes", async () => {
    const fetch = stubFetchJson(USER);
    expect(await readUser(ID)).toEqual(USER);
    expect(cacheTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(USERS.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("answers null for a 404", async () => {
    stubFetchJson({}, HTTP.STATUS.NOT_FOUND);
    expect(await readUser("missing")).toBeNull();
  });

  it("throws any other refusal, so nothing is kept", async () => {
    stubFetchJson({}, HTTP.STATUS.FORBIDDEN);
    await expect(readUser(ID)).rejects.toThrow();
  });
});
