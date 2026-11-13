// @module-tag unit

import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { cacheLife, cacheTag } from "next/cache";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@/shared/tests/fetch-stub";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@/shared/tests/session-cookie-mock";
import { USERS } from "../../constants/users";
import { userHydration, usersHydration } from "../users-hydration";
import { userKey, usersListKey } from "../users-queries";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@/shared/tests/session-cookie-mock")
);

const PARAMS = {
  [USER.PARAM.PAGE]: USER.DEFAULT_PAGE,
  [USER.PARAM.PER_PAGE]: USER.DEFAULT_PAGE_SIZE,
  [USER.PARAM.SEARCH]: "",
};

describe("usersHydration", () => {
  // TanStack stamps the time into what it dehydrates: inside the private
  // cache, that read is part of the kept result, so a prefetch carries the
  // list (outside one, it keeps the list out of every prefetch).
  it("reads the page as the Session's cookie and dehydrates it under the table's key, tagged and kept 5 minutes", async () => {
    const fetch = stubFetchJson(USERS_PAGE);
    const state = await usersHydration(PARAMS);
    expect(dehydratedData(state)).toEqual([
      { data: USERS_PAGE, queryKey: usersListKey(PARAMS) },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(USERS.CACHE.LIFE);
    // The rows hold Avatar links signed for an hour: never kept longer.
    expect(USERS.CACHE.LIFE.expire).toBeLessThanOrEqual(
      IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR
    );
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws when signed out, so no empty list is kept", async () => {
    vi.mocked(readSessionCookie).mockResolvedValueOnce("");
    stubFetchJson({}, HTTP.STATUS.UNAUTHORIZED);
    await expect(usersHydration(PARAMS)).rejects.toThrow();
  });
});

const [USER_ROW] = USERS_PAGE.users;
const ID = USER_ROW?.id ?? "";

describe("userHydration", () => {
  it("reads the User as the Session's cookie and dehydrates them under their key, tagged under the list's tag and kept 5 minutes", async () => {
    const fetch = stubFetchJson(USER_ROW);
    const state = await userHydration(ID);
    expect(dehydratedData(state)).toEqual([
      { data: USER_ROW, queryKey: userKey(ID) },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(USERS.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws for an unknown id, so nothing is kept and the view tells it is gone", async () => {
    stubFetchJson({}, HTTP.STATUS.NOT_FOUND);
    await expect(userHydration("missing")).rejects.toThrow();
  });
});
