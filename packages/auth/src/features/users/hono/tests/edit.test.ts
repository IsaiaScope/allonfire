// @module-tag unit
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import type {
  UserChange,
  UserRecord,
} from "@allonfire/database/features/auth/user.service";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import { stubUserDeps } from "./stub-user-deps";
import { testHost } from "./test-host";

const SELF_ID = "user-1";
const OTHER_ID = "user-2";
const ADMIN_HERE = { app: App.BACK_OFFICE, role: Role.ADMIN };
const ADMIN = sessionFor({ id: SELF_ID, memberships: [ADMIN_HERE] });
const PASSWORD = "A-long-password-1";
const STORED = "avatar-user-2.avif";

const rowFor = (id: string, memberships = [ADMIN_HERE]): UserRecord => ({
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  email: `${id}@edit.test`,
  id,
  image: STORED,
  imageBlurDataUrl: null,
  memberships,
  name: "Edited",
});

type Update = {
  id: string;
  change: UserChange;
  options?: { keepSessionId?: string | undefined } | undefined;
};

/** Deps recording every update the module asks for. */
const depsWith = ({
  allows = true,
  exists = true,
}: {
  allows?: boolean;
  exists?: boolean;
} = {}) => {
  const updates: Update[] = [];
  const deps: UserDeps = stubUserDeps({
    avatarLink: (image) => image && `signed:${image}`,
    canManageUsers: () => Promise.resolve(allows),
    manageApp: App.BACK_OFFICE,
    readUser: (id) => Promise.resolve(exists ? rowFor(id) : null),
    updateUser: (id, change, options) => {
      updates.push({ change, id, options });
      return Promise.resolve(exists ? rowFor(id) : null);
    },
  });
  return { deps, updates };
};

const pathOf = (id: string) =>
  `${USER.PATH.BASE}${USER.PATH.ONE.replace(":id", id)}`;

const get = (host: ReturnType<typeof testHost>, id = OTHER_ID) =>
  host.request(pathOf(id));

const patch = <T>(
  host: ReturnType<typeof testHost>,
  body: T & Json<T>,
  id = OTHER_ID
) =>
  host.request(pathOf(id), {
    body: stringifyJson(body),
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    method: HTTP.METHOD.PATCH,
  });

describe("User module: GET one", () => {
  it("answers 401 without a Session, 403 when the Host refuses", async () => {
    const { deps } = depsWith({ allows: false });
    expect((await get(testHost(null, deps))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await get(testHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
  });

  it("answers 404 for an unknown id", async () => {
    const res = await get(testHost(ADMIN, depsWith({ exists: false }).deps));
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect(await res.json()).toEqual({ code: ERROR.CODE.NOT_FOUND });
  });

  it("answers the User, their Avatar signed for now", async () => {
    const res = await get(testHost(ADMIN, depsWith().deps));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toMatchObject({
      createdAt: "2026-10-01T10:00:00.000Z",
      id: OTHER_ID,
      image: `signed:${STORED}`,
    });
  });
});

describe("User module: PATCH", () => {
  it("answers 401 without a Session, 403 when the Host refuses", async () => {
    const { deps, updates } = depsWith({ allows: false });
    expect((await patch(testHost(null, deps), { name: "X" })).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await patch(testHost(ADMIN, deps), { name: "X" })).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(updates).toEqual([]);
  });

  it("answers 400 for an empty change, one App named twice or a weak password", async () => {
    const { deps, updates } = depsWith();
    const host = testHost(ADMIN, deps);
    const statuses = await Promise.all([
      patch(host, {}),
      patch(host, {
        memberships: [
          { app: App.LAURA, role: Role.USER },
          { app: App.LAURA, role: Role.ADMIN },
        ],
      }),
      patch(host, { password: "short" }),
    ]);
    expect(statuses.map(({ status }) => status)).toEqual([
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
    ]);
    expect(updates).toEqual([]);
  });

  it("answers 404 when the User is gone", async () => {
    const res = await patch(testHost(ADMIN, depsWith({ exists: false }).deps), {
      name: "Gone",
    });
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect(await res.json()).toEqual({ code: ERROR.CODE.NOT_FOUND });
  });

  it("answers the User as edited", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(testHost(ADMIN, deps), { name: " Renamed " });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toMatchObject({ id: OTHER_ID });
    expect(updates[0]?.change).toEqual({ name: "Renamed" });
  });

  it("hashes a new password and keeps the caller's Session only when editing themselves", async () => {
    const { deps, updates } = depsWith();
    const host = testHost(ADMIN, deps);
    await patch(host, { password: PASSWORD });
    await patch(host, { password: PASSWORD }, SELF_ID);
    const [other, self] = updates;
    expect(other?.change.hashedPassword).toEqual(expect.any(String));
    expect(other?.change.hashedPassword).not.toBe(PASSWORD);
    expect(other?.options?.keepSessionId).toBeUndefined();
    expect(self?.options?.keepSessionId).toBe(ADMIN.session.id);
  });

  it("refuses a change to your own Role in manageApp", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(
      testHost(ADMIN, deps),
      { memberships: [{ app: App.LAURA, role: Role.ADMIN }] },
      SELF_ID
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await res.json()).toEqual({
      code: USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE,
    });
    expect(updates).toEqual([]);
  });

  it("lets you save yourself with that Membership unchanged", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(
      testHost(ADMIN, deps),
      { memberships: [ADMIN_HERE, { app: App.LAURA, role: Role.VIEWER }] },
      SELF_ID
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(updates).toHaveLength(1);
  });

  it("lets you change another User's Role in manageApp", async () => {
    const { deps } = depsWith();
    const res = await patch(testHost(ADMIN, deps), { memberships: [] });
    expect(res.status).toBe(HTTP.STATUS.OK);
  });
});
