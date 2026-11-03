// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { LOCAL } from "@allonfire/config/local/addresses";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { hc } from "hono/client";
import { USERS } from "../../constants/users";
import { usersQuery } from "../users-queries";

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
