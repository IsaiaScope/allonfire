// @module-tag integration
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import {
  userCreatedBodySchema,
  userDeleteBodySchema,
  userListBodySchema,
} from "@allonfire/auth/features/users/hono/constants/schemas";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { upsertUser } from "@allonfire/database/features/seed/upsert-user";
import { hashPassword } from "better-auth/crypto";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import {
  cookieFor,
  ORIGIN,
  signIn,
  type TestApp,
} from "../../../shared/tests/sign-in";
import { auth } from "../../auth/auth";
import { problemOf } from "../../errors/tests/problem-of";
import { userDeps } from "../user-deps";

const LIST = API.PATH.USERS;
const LARGEST_PAGE = Math.max(...USER.PAGE_SIZES);

let app: TestApp;
beforeEach(() => {
  app = createApp(appDeps({ auth, users: userDeps() }));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const get = (path: string, cookie?: string) =>
  app.request(path, {
    headers: { origin: ORIGIN, ...(cookie && { cookie }) },
  });

describe("listing Users on the Fixtures", () => {
  it("lists every User to a Back Office Admin", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const res = await get(
      `${LIST}?${new URLSearchParams({ [USER.PARAM.PER_PAGE]: String(LARGEST_PAGE) })}`,
      cookie
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    const body = userListBodySchema.parse(await res.json());
    expect(body.total).toBeGreaterThanOrEqual(FIXTURE.USERS.length);
    expect(body.users.map(({ email }) => email)).toContain(
      FIXTURE.USER.NO_MEMBERSHIP.email
    );
  });

  it("filters by App and Role on one Membership", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const query = new URLSearchParams({
      [USER.PARAM.PER_PAGE]: String(LARGEST_PAGE),
      [USER.PARAM.SEARCH]: USER_SEARCH.serialize({
        app: App.LAURA,
        role: Role.ADMIN,
        text: FIXTURE.DOMAIN,
      }),
    });
    const res = await get(`${LIST}?${query}`, cookie);
    const emails = userListBodySchema
      .parse(await res.json())
      .users.map(({ email }) => email);
    expect(emails).toContain(FIXTURE.USER.LAURA.ADMIN.email);
    expect(emails).not.toContain(FIXTURE.USER.BACK_OFFICE.ADMIN.email);
  });

  it.each([
    ["a Laura Admin", FIXTURE.USER.LAURA.ADMIN],
    ["a Back Office User", FIXTURE.USER.BACK_OFFICE.USER],
  ])("refuses %s with a 403 problem document", async (_, user) => {
    const res = await get(LIST, await cookieFor(app, user));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await problemOf(res)).code).toBe(API.ERROR.CODE.FORBIDDEN);
  });

  it("answers 401 without a Session", async () => {
    const res = await get(LIST);
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect((await problemOf(res)).code).toBe(API.ERROR.CODE.UNAUTHORIZED);
  });
});

// Users made here for deletion, in their own domain so the list's counts hold.
const DELETABLE = "delete-users-api.test";
const throwaway = (name: string) =>
  prisma.user.create({
    data: { email: `${name}@${DELETABLE}` },
    select: { id: true },
  });
const remove = (ids: readonly string[], cookie?: string) =>
  app.request(LIST, {
    body: stringifyJson({ ids }),
    headers: {
      [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      origin: ORIGIN,
      ...(cookie && { cookie }),
    },
    method: HTTP.METHOD.DELETE,
  });
const exists = async (id: string) =>
  (await prisma.user.count({ where: { id } })) === 1;

describe("deleting Users", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DELETABLE } } });
  });

  it("refuses a visitor (401) and a non-Admin (403)", async () => {
    const { id } = await throwaway("refused");
    expect((await remove([id])).status).toBe(HTTP.STATUS.UNAUTHORIZED);
    const cookie = await cookieFor(app, FIXTURE.USER.LAURA.USER);
    const res = await remove([id], cookie);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await problemOf(res)).code).toBe(API.ERROR.CODE.FORBIDDEN);
    expect(await exists(id)).toBe(true);
  });

  it("refuses your own id with CANNOT_DELETE_SELF", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const self = await prisma.user.findUniqueOrThrow({
      select: { id: true },
      where: { email: FIXTURE.USER.BACK_OFFICE.ADMIN.email },
    });
    const { id } = await throwaway("beside-self");
    const res = await remove([id, self.id], cookie);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    const problem = await problemOf(res);
    expect(problem.code).toBe(API.ERROR.CODE.CANNOT_DELETE_SELF);
    expect(problem.detail).toBe("You cannot delete yourself");
    expect(await exists(self.id)).toBe(true);
    expect(await exists(id)).toBe(true);
  });

  it("deletes a throwaway User", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const { id } = await throwaway("deleted");
    const res = await remove([id], cookie);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(userDeleteBodySchema.parse(await res.json())).toEqual({
      deleted: 1,
    });
    expect(await exists(id)).toBe(false);
  });

  it("refuses an Admin demoted since their cookie was cached", async () => {
    const demoted = { email: `demoted@${DELETABLE}` };
    await upsertUser(
      prisma,
      {
        ...demoted,
        memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
        name: "demoted",
      },
      await hashPassword(FIXTURE.PASSWORD)
    );
    const cookie = await cookieFor(app, demoted);
    await prisma.membership.updateMany({
      data: { role: Role.USER },
      where: { app: App.BACK_OFFICE, user: { email: demoted.email } },
    });
    const { id } = await throwaway("kept");
    expect((await remove([id], cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await exists(id)).toBe(true);
  });

  it("canManageUsers is false for an unknown id", async () => {
    expect(await userDeps().canManageUsers("missing-id")).toBe(false);
  });
});

// Users added here, in their own domain so the list's counts hold.
const ADDED = "add-users-api.test";
const PASSWORD = "A-long-password-1";
const add = <T>(body: T & Json<T>, cookie?: string) =>
  app.request(LIST, {
    body: stringifyJson(body),
    headers: {
      [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      origin: ORIGIN,
      ...(cookie && { cookie }),
    },
    method: HTTP.METHOD.POST,
  });
const newUser = (name: string) => ({
  email: `${name}@${ADDED}`,
  memberships: [{ app: App.LAURA, role: Role.USER }],
  name,
  password: PASSWORD,
});

describe("adding Users", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: ADDED } } });
  });

  it("creates a User who can sign in", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const body = newUser("signs-in");
    const res = await add(body, cookie);
    expect(res.status).toBe(HTTP.STATUS.CREATED);
    expect(userCreatedBodySchema.parse(await res.json()).id).toBeTruthy();
    expect((await signIn(app, body, { password: PASSWORD })).status).toBe(
      HTTP.STATUS.OK
    );
  });

  it("answers 409 EMAIL_TAKEN with its message for a Fixture's email", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const res = await add(
      { ...newUser("taken"), email: FIXTURE.USER.LAURA.ADMIN.email },
      cookie
    );
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    const problem = await problemOf(res);
    expect(problem.code).toBe(API.ERROR.CODE.EMAIL_TAKEN);
    expect(problem.detail).toBe("An account with this email already exists");
  });

  it("refuses an Admin demoted since their cookie was cached", async () => {
    const demoted = { email: `demoted@${ADDED}` };
    await upsertUser(
      prisma,
      {
        ...demoted,
        memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
        name: "demoted",
      },
      await hashPassword(FIXTURE.PASSWORD)
    );
    const cookie = await cookieFor(app, demoted);
    await prisma.membership.updateMany({
      data: { role: Role.USER },
      where: { app: App.BACK_OFFICE, user: { email: demoted.email } },
    });
    const body = newUser("never");
    expect((await add(body, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
  });
});
