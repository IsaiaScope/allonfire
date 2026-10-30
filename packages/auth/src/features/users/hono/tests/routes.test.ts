// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App, Role } from "@allonfire/database/enums";
import type {
  UserListQuery,
  UserRecord,
} from "@allonfire/database/features/auth/user.service";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { USER } from "../../constants/users";
import { userListBodySchema } from "../constants/schemas";
import type { UserDeps } from "../utils/deps";
import { stubUserDeps } from "./stub-user-deps";
import { testHost } from "./test-host";

const LIST = USER.PATH.BASE;
const ADMIN = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});
const TOTAL = 60;
const USER_ROW: UserRecord = {
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  email: FIXTURE.USER.LAURA.ADMIN.email,
  id: "user-2",
  image: null,
  imageBlurDataUrl: null,
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
  name: FIXTURE.USER.LAURA.ADMIN.name,
};

/** Deps that record each list query and let in whom `allows` says. */
const depsWith = (allows = true) => {
  const queries: UserListQuery[] = [];
  const deps: UserDeps = {
    ...stubUserDeps(),
    canListUsers: () => allows,
    deleteUsers: () => Promise.resolve(0),
    listUsers: (query) => {
      queries.push(query);
      return Promise.resolve({ total: TOTAL, users: [USER_ROW] });
    },
  };
  return { deps, queries };
};

/** A list query, its keys the module's own params. */
const queryOf = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();
const [, MIDDLE_PAGE_SIZE] = USER.PAGE_SIZES;

const listWith = async (search: string) => {
  const { deps, queries } = depsWith();
  const res = await testHost(ADMIN, deps).request(`${LIST}?${search}`);
  return { query: queries[0], status: res.status };
};

describe("User module", () => {
  it("answers 401 without a Session and never lists", async () => {
    const { deps, queries } = depsWith();
    const host = testHost(null, deps);
    expect((await host.request(LIST)).status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(queries).toEqual([]);
  });

  it("answers 403 to a User the Host does not let list Users", async () => {
    const { deps, queries } = depsWith(false);
    const host = testHost(ADMIN, deps);
    expect((await host.request(LIST)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(queries).toEqual([]);
  });

  it("reads the search, page and page size into the query", async () => {
    expect(
      await listWith(
        queryOf({
          [USER.PARAM.PAGE]: "2",
          [USER.PARAM.PER_PAGE]: String(MIDDLE_PAGE_SIZE),
          // A hand-typed address: fields in any case.
          [USER.PARAM.SEARCH]: "APP:Laura role:admin isa",
        })
      )
    ).toEqual({
      query: {
        app: [App.LAURA],
        page: 2,
        perPage: MIDDLE_PAGE_SIZE,
        role: [Role.ADMIN],
        text: "isa",
      },
      status: HTTP.STATUS.OK,
    });
  });

  it.each(["0", "-3", "abc", String(USER.MAX_PAGE + 1)])(
    "falls back to the first page on page=%s",
    async (page) => {
      expect(await listWith(queryOf({ [USER.PARAM.PAGE]: page }))).toEqual({
        query: expect.objectContaining({ page: USER.DEFAULT_PAGE }),
        status: HTTP.STATUS.OK,
      });
    }
  );

  it.each(["7", "abc"])(
    "falls back to the default page size on perPage=%s",
    async (perPage) => {
      expect(
        await listWith(queryOf({ [USER.PARAM.PER_PAGE]: perPage }))
      ).toEqual({
        query: expect.objectContaining({ perPage: USER.DEFAULT_PAGE_SIZE }),
        status: HTTP.STATUS.OK,
      });
    }
  );

  it("drops an unknown search field or value", async () => {
    expect(
      await listWith(queryOf({ [USER.PARAM.SEARCH]: "role:boss team:x" }))
    ).toEqual({
      query: {
        page: USER.DEFAULT_PAGE,
        perPage: USER.DEFAULT_PAGE_SIZE,
        text: "",
      },
      status: HTTP.STATUS.OK,
    });
  });

  it("answers the page, the total and how many pages it makes", async () => {
    const { deps } = depsWith();
    const res = await testHost(ADMIN, deps).request(
      `${LIST}?${queryOf({ [USER.PARAM.PER_PAGE]: String(USER.DEFAULT_PAGE_SIZE) })}`
    );
    expect(userListBodySchema.parse(await res.json())).toEqual({
      pageCount: Math.ceil(TOTAL / USER.DEFAULT_PAGE_SIZE),
      total: TOTAL,
      users: [{ ...USER_ROW, createdAt: USER_ROW.createdAt.toISOString() }],
    });
  });
});
