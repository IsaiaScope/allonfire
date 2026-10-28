// @module-tag unit

import { USER } from "@allonfire/auth/features/users/constants/users";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { cacheLife, cacheTag } from "next/cache";
import { USERS } from "../../constants/users";
import { readUsers } from "../read-users";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// The App's env is read at import, which a unit test lacks.
vi.mock("@/environment/environment", () => ({
  env: { API_URL: TEST_API_URL },
}));

const COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;
const PARAMS = {
  [USER.PARAM.PAGE]: USER.DEFAULT_PAGE,
  [USER.PARAM.PER_PAGE]: USER.DEFAULT_PAGE_SIZE,
  [USER.PARAM.SEARCH]: "",
};
const BODY = { total: 0, users: [] };

describe("readUsers", () => {
  it("reads the page as the Session, kept under the Users tag", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(BODY)
    );
    vi.stubGlobal("fetch", fetch);
    expect(await readUsers(COOKIE, PARAMS)).toEqual(BODY);
    expect(cacheTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(USERS.CACHE.LIFE);
    // The rows hold Avatar links signed for an hour: never kept longer.
    expect(USERS.CACHE.LIFE.expire).toBeLessThanOrEqual(
      IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR
    );
    const [, init] = fetch.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get(HTTP.HEADER.COOKIE)).toBe(COOKIE);
  });
});
