// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { LOCAL } from "@allonfire/config/local/addresses";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { USERS } from "../../constants/users";
import { userKey, userQuery, usersQuery } from "../users-queries";

const PARAMS = {
  [USER.PARAM.PAGE]: USER.DEFAULT_PAGE,
  [USER.PARAM.PER_PAGE]: USER.DEFAULT_PAGE_SIZE,
  [USER.PARAM.SEARCH]: "",
};

describe("usersQuery", () => {
  // The page hands the table a copy the browser keeps for the cache's
  // `stale`: a shorter TanStack clock would read it again at once.
  it("treats a page as fresh as long as the kept copy is", () => {
    expect(usersQuery(hc<ApiType>(LOCAL.URL.TEST_API), PARAMS).staleTime).toBe(
      USERS.CACHE.LIFE.stale * UNIT.MS_PER_SECOND
    );
  });
});

describe("userQuery", () => {
  const api = hc<ApiType>(LOCAL.URL.TEST_API);

  it("keys one User by their id", () => {
    expect(userKey("user-1")).toEqual(QUERY.USERS.ONE("user-1"));
  });

  // Asked again only by an action: never on a clock, a focus or a reconnect
  // (the form's Version must stay the one it opened with).
  it("is never stale, so only an action asks for it again", () => {
    expect(userQuery(api, "user-1").staleTime).toBe("static");
  });
});
