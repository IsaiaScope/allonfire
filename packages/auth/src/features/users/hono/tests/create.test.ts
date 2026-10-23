// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import {
  EmailTakenError,
  type NewUser,
} from "@allonfire/database/features/auth/user.service";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import { testHost } from "./test-host";

const ADMIN = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});
const NEW_ID = "user-new";
const VALID = {
  email: "new@create.test",
  memberships: [{ app: App.LAURA, role: Role.USER }],
  name: "New",
  password: "A-long-password-1",
};

/** Deps that record what they were asked to create. */
const depsWith = ({
  allows = true,
  taken = false,
}: {
  allows?: boolean;
  taken?: boolean;
} = {}) => {
  const created: { hash: string; user: NewUser }[] = [];
  const deps: UserDeps = {
    canListUsers: () => true,
    canManageUsers: () => Promise.resolve(allows),
    createUser: (user, hash) => {
      if (taken) {
        return Promise.reject(new EmailTakenError());
      }
      created.push({ hash, user });
      return Promise.resolve({ id: NEW_ID });
    },
    deleteUsers: () => Promise.resolve(0),
    listUsers: () => Promise.resolve({ total: 0, users: [] }),
  };
  return { created, deps };
};

const post = <T>(host: ReturnType<typeof testHost>, body: T & Json<T>) =>
  host.request(USER.PATH.BASE, {
    body: stringifyJson(body),
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    method: HTTP.METHOD.POST,
  });

describe("User module: POST", () => {
  it("answers 401 without a Session, 403 when the Host refuses", async () => {
    const { created, deps } = depsWith({ allows: false });
    expect((await post(testHost(null, deps), VALID)).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await post(testHost(ADMIN, deps), VALID)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(created).toEqual([]);
  });

  it("answers 400 for a password missing any of passwordRules", async () => {
    const { created, deps } = depsWith();
    const host = testHost(ADMIN, deps);
    const statuses = await Promise.all(
      [
        "a-long-password-1",
        "A-LONG-PASSWORD-1",
        "A-long-password-x",
        "Along1password2x",
      ].map(
        async (password) => (await post(host, { ...VALID, password })).status
      )
    );
    expect(statuses).toEqual(
      Array.from({ length: 4 }, () => HTTP.STATUS.BAD_REQUEST)
    );
    expect(created).toEqual([]);
  });

  it("answers 400 for a bad email, a short password, or two Memberships in one App", async () => {
    const { created, deps } = depsWith();
    const host = testHost(ADMIN, deps);
    const statuses = await Promise.all(
      [
        { ...VALID, email: "not-an-email" },
        {
          ...VALID,
          password: "Aa1-".repeat(USER.LIMIT.PASSWORD_MIN / 4).slice(1),
        },
        {
          ...VALID,
          memberships: [
            { app: App.LAURA, role: Role.USER },
            { app: App.LAURA, role: Role.ADMIN },
          ],
        },
      ].map(async (body) => (await post(host, body)).status)
    );
    expect(statuses).toEqual([
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.BAD_REQUEST,
    ]);
    expect(created).toEqual([]);
  });

  it("hashes the password and creates the User", async () => {
    const { created, deps } = depsWith();
    const res = await post(testHost(ADMIN, deps), VALID);
    expect(res.status).toBe(HTTP.STATUS.CREATED);
    expect(await res.json()).toEqual({ id: NEW_ID });
    expect(created).toHaveLength(1);
    expect(created[0]?.hash).not.toBe(VALID.password);
    expect(created[0]?.user).toEqual({
      email: VALID.email,
      memberships: VALID.memberships,
      name: VALID.name,
    });
  });

  it("answers 409 EMAIL_TAKEN when the email is taken", async () => {
    const { deps } = depsWith({ taken: true });
    const res = await post(testHost(ADMIN, deps), VALID);
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect(await res.json()).toEqual({ code: USER.ERROR_CODE.EMAIL_TAKEN });
  });
});
