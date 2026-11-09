// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { Json } from "@allonfire/core/shared/utils/json";
import { errorOf, json } from "../../../../shared/tests/test-host";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import {
  BACK_OFFICE_ADMIN as ADMIN,
  stubUserDeps,
  userHost,
} from "./stub-user-deps";

const SELF = ADMIN.user.id;
const OTHER = "user-2";
const DELETED = 1;

/** Deps that record whom they were asked about and which ids they deleted. */
const depsWith = (allows = true) => {
  const asked: { sessionId: string; userId: string }[] = [];
  const deleted: string[][] = [];
  const deps: UserDeps = {
    ...stubUserDeps(),
    canListUsers: () => true,
    canManageUsers: (caller) => {
      asked.push(caller);
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

const remove = <T>(host: ReturnType<typeof userHost>, body: T & Json<T>) =>
  host.request(USER.PATH.BASE, json(HTTP.METHOD.DELETE, body));

describe("User module: DELETE", () => {
  it("answers 401 without a Session", async () => {
    const { deleted, deps } = depsWith();
    const res = await remove(userHost(null, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(deleted).toEqual([]);
  });

  it("answers 403 when the Host refuses", async () => {
    const { deleted, deps } = depsWith(false);
    const res = await remove(userHost(ADMIN, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(deleted).toEqual([]);
  });

  it("answers 400 for an empty list, too many ids, or a non-string id", async () => {
    const { deleted, deps } = depsWith();
    const host = userHost(ADMIN, deps);
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
    const res = await remove(userHost(ADMIN, deps), { ids: [OTHER, SELF] });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await errorOf(res)).code).toBe(USER.ERROR_CODE.CANNOT_DELETE_SELF);
    expect(deleted).toEqual([]);
  });

  it("deletes the ids and answers the count, asking the Host with the caller's Session and User ids", async () => {
    const { asked, deleted, deps } = depsWith();
    const res = await remove(userHost(ADMIN, deps), { ids: [OTHER] });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: DELETED });
    expect(deleted).toEqual([[OTHER]]);
    expect(asked).toEqual([{ sessionId: ADMIN.session.id, userId: SELF }]);
  });
});
