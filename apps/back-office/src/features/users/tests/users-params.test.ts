// @module-tag unit
import type { ApiType } from "@allonfire/api/client";
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { DetailedError, hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { USERS } from "../constants/users";
import { loadUsersParams } from "../constants/users-params";
import { retryUsers, usersQuery } from "../utils/users-queries";

// A client of its own: the App's `api` reads the env, which a unit test lacks.
const api = hc<ApiType>(TEST_API_URL);
/** Any page past the first. */
const SOME_PAGE = 3;
const TEXT = "isa";
const DEFAULTS = {
  [USER.PARAM.PAGE]: USER.DEFAULT_PAGE,
  [USER.PARAM.PER_PAGE]: USER.DEFAULT_PAGE_SIZE,
  [USER.PARAM.SEARCH]: "",
};

describe("loadUsersParams", () => {
  it("reads nothing as the first page of 25 with no search", () => {
    expect(loadUsersParams({})).toEqual(DEFAULTS);
  });

  it.each(["0", "-3", "abc", "1.5", String(USER.MAX_PAGE + 1)])(
    "reads page=%s as the first page",
    (page) => {
      expect(loadUsersParams({ [USER.PARAM.PAGE]: page })).toEqual(DEFAULTS);
    }
  );

  it("keeps a page and a page size it allows", () => {
    const [, perPage] = USER.PAGE_SIZES;
    expect(
      loadUsersParams({
        [USER.PARAM.PAGE]: String(SOME_PAGE),
        [USER.PARAM.PER_PAGE]: String(perPage),
      })
    ).toEqual({
      ...DEFAULTS,
      [USER.PARAM.PAGE]: SOME_PAGE,
      [USER.PARAM.PER_PAGE]: perPage,
    });
  });

  it("reads a page size it does not allow as 25", () => {
    expect(loadUsersParams({ [USER.PARAM.PER_PAGE]: "7" })).toEqual(DEFAULTS);
  });

  it("cleans the search: unknown fields dropped, the rest canonical", () => {
    // A hand-typed address: an unknown value, a field in capitals.
    expect(
      loadUsersParams({ [USER.PARAM.SEARCH]: `role:boss APP:Laura ${TEXT}` })
    ).toEqual({
      ...DEFAULTS,
      [USER.PARAM.SEARCH]: USER_SEARCH.serialize({
        app: App.LAURA,
        text: TEXT,
      }),
    });
  });
});

describe("Users queries", () => {
  it("keys the list by its params", () => {
    expect(usersQuery(api, DEFAULTS).queryKey).toEqual(
      QUERY.USERS.LIST(DEFAULTS)
    );
  });
});

describe("retryUsers", () => {
  it("never asks again after the API refused", () => {
    expect(
      retryUsers(
        0,
        new DetailedError("refused", { statusCode: HTTP.STATUS.FORBIDDEN })
      )
    ).toBe(false);
  });

  it("asks once more after a server or network failure, then stops", () => {
    expect(
      retryUsers(
        0,
        new DetailedError("down", {
          statusCode: HTTP.STATUS.INTERNAL_SERVER_ERROR,
        })
      )
    ).toBe(true);
    expect(retryUsers(0, new TypeError("offline"))).toBe(true);
    expect(retryUsers(USERS.RETRIES, new TypeError("offline"))).toBe(false);
  });

  it("is what the list retries with", () => {
    expect(usersQuery(api, DEFAULTS).retry).toBe(retryUsers);
  });
});
