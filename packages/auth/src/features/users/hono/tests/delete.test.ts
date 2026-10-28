// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import { stubUserDeps } from "./stub-user-deps";
import { testHost } from "./test-host";

const ADMIN = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});
const SELF = ADMIN.user.id;
const OTHER = "user-2";
const DELETED = 1;

/** Deps that record whom they were asked about and which ids they deleted. */
const depsWith = (allows = true) => {
  const asked: string[] = [];
  const deleted: string[][] = [];
  const deps: UserDeps = {
    ...stubUserDeps(),
    canListUsers: () => true,
    canManageUsers: (userId) => {
      asked.push(userId);
      return Promise.resolve(allows);
    },
    deleteUsers: (ids) => {
      deleted.push([...ids]);
      return Promise.resolve(DELETED);
    },
    listUsers: () => Promise.resolve({ total: 0, users: [] }),
  };
  return { asked, deleted, deps };
};

const remove = <T>(host: ReturnType<typeof testHost>, body: T & Json<T>) =>
  host.request(USER.PATH.BASE, {
    body: stringifyJson(body),
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    method: HTTP.METHOD.DELETE,
  });

describe("User module: DELETE", () => {
  it("answers 401 without a Session", async () => {
    const { deleted, deps } = depsWith();
    const res = await remove(testHost(null, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(deleted).toEqual([]);
  });

  it("answers 403 when the Host refuses", async () => {
    const { deleted, deps } = depsWith(false);
    const res = await remove(testHost(ADMIN, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(deleted).toEqual([]);
  });

  it("answers 400 for an empty list, too many ids, or a non-string id", async () => {
    const { deleted, deps } = depsWith();
    const host = testHost(ADMIN, deps);
    const tooMany = Array.from(
      { length: USER.MAX_DELETE + 1 },
      (_, index) => `user-${index + 2}`
    );
    const statuses = await Promise.all(
      [[], tooMany, [DELETED]].map(
        async (ids) => (await remove(host, { ids })).status
      )
    );
    expect(statuses).toEqual([
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
    ]);
    expect(deleted).toEqual([]);
  });

  it("refuses a list holding your own id and deletes nobody", async () => {
    const { deleted, deps } = depsWith();
    const res = await remove(testHost(ADMIN, deps), { ids: [OTHER, SELF] });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await res.json()).toEqual({
      code: USER.ERROR_CODE.CANNOT_DELETE_SELF,
    });
    expect(deleted).toEqual([]);
  });

  it("deletes the ids and answers the count", async () => {
    const { asked, deleted, deps } = depsWith();
    const res = await remove(testHost(ADMIN, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: DELETED });
    expect(deleted).toEqual([[OTHER]]);
    expect(asked).toEqual([SELF]);
  });
});
