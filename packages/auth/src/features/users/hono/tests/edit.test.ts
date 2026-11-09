// @module-tag unit

import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, Role } from "@allonfire/database/enums";
import type {
  UserChange,
  UserRecord,
} from "@allonfire/database/features/auth/user.service";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type { z } from "zod";
import { errorOf, json } from "../../../../shared/tests/test-host";
import { USER } from "../../constants/users";
import type { userUpdateRequestSchema } from "../constants/schemas";
import type { UserDeps } from "../utils/deps";
import {
  BACK_OFFICE_ADMIN as ADMIN,
  stubUserDeps,
  userHost,
  userRow,
} from "./stub-user-deps";

const SELF_ID = ADMIN.user.id;
const OTHER_ID = "user-2";
const ADMIN_HERE = { app: App.BACK_OFFICE, role: Role.ADMIN };
const STORED = "avatar-user-2.avif";
/** The Version an edit leaves the User on. */
const EDITED_VERSION = "version-2";

const rowFor = (id: string, memberships = [ADMIN_HERE]): UserRecord =>
  userRow({
    email: `${id}@edit.test`,
    id,
    image: STORED,
    memberships,
    name: "Edited",
  });
/** The Version every stored row answers, and so every edit form carries. */
const VERSION = rowFor(OTHER_ID).version;

type Update = {
  id: string;
  change: UserChange;
  options?:
    | { expectedVersion: string; keepSessionId?: string | undefined }
    | undefined;
};

/** Deps recording every update the module asks for. */
const depsWith = ({
  allows = true,
  changed = false,
  exists = true,
}: {
  allows?: boolean;
  /** The stored User changed since the Version the edit carries. */
  changed?: boolean;
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
      if (changed) {
        return Promise.reject(new ResourceChangedError());
      }
      return Promise.resolve(
        exists ? { ...rowFor(id), version: EDITED_VERSION } : null
      );
    },
  });
  return { deps, updates };
};

const pathOf = (id: string) =>
  `${USER.PATH.BASE}${fillPath(USER.PATH.ONE, { id })}`;

const get = (host: ReturnType<typeof userHost>, id = OTHER_ID) =>
  host.request(pathOf(id));

/** An edit's body; `version` defaults to the stored row's, as a form opened now sends it. */
type PatchBody = Partial<
  Omit<z.input<typeof userUpdateRequestSchema>, "version">
> & { version?: string | undefined };

const patch = (
  host: ReturnType<typeof userHost>,
  body: PatchBody,
  id = OTHER_ID
) =>
  host.request(
    pathOf(id),
    json(HTTP.METHOD.PATCH, { version: VERSION, ...body })
  );

describe("User module: GET one", () => {
  it("answers 401 without a Session, 403 when the Host refuses", async () => {
    const { deps } = depsWith({ allows: false });
    expect((await get(userHost(null, deps))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await get(userHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
  });

  it("answers 404 for an unknown id", async () => {
    const res = await get(userHost(ADMIN, depsWith({ exists: false }).deps));
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
  });

  it("answers the User, their Avatar signed for now", async () => {
    const res = await get(userHost(ADMIN, depsWith().deps));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toMatchObject({
      createdAt: rowFor(OTHER_ID).createdAt.toISOString(),
      id: OTHER_ID,
      image: `signed:${STORED}`,
    });
  });
});

describe("User module: PATCH", () => {
  it("answers 401 without a Session, 403 when the Host refuses", async () => {
    const { deps, updates } = depsWith({ allows: false });
    expect((await patch(userHost(null, deps), { name: "X" })).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await patch(userHost(ADMIN, deps), { name: "X" })).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(updates).toEqual([]);
  });

  it("answers 400 for an empty change, one App named twice or a weak password", async () => {
    const { deps, updates } = depsWith();
    const host = userHost(ADMIN, deps);
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
    const res = await patch(userHost(ADMIN, depsWith({ exists: false }).deps), {
      name: "Gone",
    });
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
  });

  it("answers the User as edited: the PATCH answer carries the new Version", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(userHost(ADMIN, deps), {
      name: " Renamed ",
    });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toMatchObject({
      id: OTHER_ID,
      version: EDITED_VERSION,
    });
    expect(updates[0]?.change).toEqual({ name: "Renamed" });
  });

  it("hashes a new password and keeps the caller's Session only when editing themselves", async () => {
    const { deps, updates } = depsWith();
    const host = userHost(ADMIN, deps);
    await patch(host, { password: FIXTURE.PASSWORD });
    await patch(host, { password: FIXTURE.PASSWORD }, SELF_ID);
    const [other, self] = updates;
    expect(other?.change.hashedPassword).toEqual(expect.any(String));
    expect(other?.change.hashedPassword).not.toBe(FIXTURE.PASSWORD);
    expect(other?.options?.keepSessionId).toBeUndefined();
    expect(self?.options?.keepSessionId).toBe(ADMIN.session.id);
  });

  it("refuses a change to your own Role in manageApp", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(
      userHost(ADMIN, deps),
      { memberships: [{ app: App.LAURA, role: Role.ADMIN }] },
      SELF_ID
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await errorOf(res)).code).toBe(
      USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE
    );
    expect(updates).toEqual([]);
  });

  it("lets you save yourself with that Membership unchanged", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(
      userHost(ADMIN, deps),
      {
        memberships: [ADMIN_HERE, { app: App.LAURA, role: Role.VIEWER }],
      },
      SELF_ID
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(updates).toHaveLength(1);
  });

  it("answers 409 RESOURCE_CHANGED when the stored User changed since the version", async () => {
    const res = await patch(userHost(ADMIN, depsWith({ changed: true }).deps), {
      name: "Late",
    });
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.RESOURCE_CHANGED);
  });

  it("refuses a PATCH without a version", async () => {
    const { deps, updates } = depsWith();
    const res = await patch(userHost(ADMIN, deps), {
      name: "No version",
      version: undefined,
    });
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(updates).toEqual([]);
  });

  it("passes the version through to updateUser", async () => {
    const { deps, updates } = depsWith();
    await patch(userHost(ADMIN, deps), { name: "Renamed" });
    expect(updates[0]?.options?.expectedVersion).toBe(VERSION);
  });

  it("lets you change another User's Role in manageApp", async () => {
    const { deps } = depsWith();
    const res = await patch(userHost(ADMIN, deps), {
      memberships: [],
    });
    expect(res.status).toBe(HTTP.STATUS.OK);
  });
});

describe("User module: PATCH the email's verification", () => {
  it("requires verification again, or vouches for the email, alone as a change", async () => {
    const { deps, updates } = depsWith();
    const host = userHost(ADMIN, deps);
    expect((await patch(host, { emailVerified: false })).status).toBe(
      HTTP.STATUS.OK
    );
    expect((await patch(host, { emailVerified: true })).status).toBe(
      HTTP.STATUS.OK
    );
    expect(updates.map(({ change }) => change)).toEqual([
      { emailVerified: false },
      { emailVerified: true },
    ]);
  });
});
