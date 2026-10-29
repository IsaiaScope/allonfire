// @module-tag integration

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import {
  userBodySchema,
  userCreatedBodySchema,
  userDeleteBodySchema,
  userListBodySchema,
} from "@allonfire/auth/features/users/hono/constants/schemas";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { upsertUser } from "@allonfire/database/features/seed/upsert-user";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE_FIXTURE_FILES } from "@allonfire/storage/features/image/fixtures/constants/files";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { pictureLink } from "@allonfire/storage/features/image-server/sign";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
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
const BLUR_DATA_URL = /^data:image\/webp;base64,/;
const LARGEST_PAGE = Math.max(...USER.PAGE_SIZES);

let app: TestApp;
beforeEach(() => {
  app = createApp(
    appDeps({ auth, users: userDeps({ warn: () => undefined }) })
  );
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
        app: [App.LAURA],
        role: [Role.ADMIN],
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

  it("canManageUsers is false for an unknown User or Session", async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      select: { id: true, sessions: { select: { id: true }, take: 1 } },
      where: { email: FIXTURE.USER.BACK_OFFICE.ADMIN.email },
    });
    const { canManageUsers } = userDeps({ warn: () => undefined });
    expect(
      await canManageUsers({
        sessionId: admin.sessions[0]?.id ?? "missing-session",
        userId: "missing-id",
      })
    ).toBe(false);
    expect(
      await canManageUsers({ sessionId: "missing-session", userId: admin.id })
    ).toBe(false);
  });

  it("a deleted Session stops writing at once", async () => {
    const signedOut = { email: `signed-out@${DELETABLE}` };
    await upsertUser(
      prisma,
      {
        ...signedOut,
        memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
        name: "signed out",
      },
      await hashPassword(FIXTURE.PASSWORD)
    );
    const cookie = await cookieFor(app, signedOut);
    // As a new password ends it; the cookie keeps its signed copy.
    await prisma.session.deleteMany({ where: { user: signedOut } });
    const { id } = await throwaway("outlived");
    expect((await remove([id], cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await exists(id)).toBe(true);
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

describe("a User's Avatar", () => {
  const PICTURED = "avatar.test";
  const PHOTO = readFileSync(resolve(IMAGE_FIXTURE_FILES, "photo.jpg"));
  const avatarPath = (id: string) =>
    `${LIST}${USER.PATH.AVATAR.replace(":id", id)}`;
  const put = (id: string, cookie: string) => {
    const form = new FormData();
    form.append("file", new File([PHOTO], "photo.jpg"));
    return app.request(avatarPath(id), {
      body: form,
      headers: { cookie, origin: ORIGIN },
      method: HTTP.METHOD.PUT,
    });
  };
  const removeAvatar = (id: string, cookie: string) =>
    app.request(avatarPath(id), {
      headers: { cookie, origin: ORIGIN },
      method: HTTP.METHOD.DELETE,
    });
  const imageOf = async (id: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id } })).image;
  /** Whether the image server still finds the file. */
  const stored = async (key: string | null) =>
    (
      await fetch(
        pictureLink({ key: key ?? "", width: IMAGE_SERVER.AVATAR_WIDTH })
      )
    ).status === HTTP.STATUS.OK;
  const linkSchema = z.object({
    image: z.string(),
    imageBlurDataUrl: z.string(),
  });
  /** A deleted file's link is dead once the image cache asked imgproxy again. */
  const UNTIL_CACHE_CHECKED = {
    timeout: (IMAGE_SERVER.CACHE_CHECK_SECONDS + 1) * UNIT.MS_PER_SECOND,
  };

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: PICTURED } } });
  });

  it("stores a picture and answers a link that loads it at the Avatar's width, for the hour", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const { id } = await prisma.user.create({
      data: { email: `first@${PICTURED}` },
      select: { id: true },
    });
    const res = await put(id, cookie);
    expect(res.status).toBe(HTTP.STATUS.OK);
    const { image, imageBlurDataUrl } = linkSchema.parse(await res.json());
    expect(image).toContain(`/rs:fit:${IMAGE_SERVER.AVATAR_WIDTH}:0/exp:`);
    expect(imageBlurDataUrl).toMatch(BLUR_DATA_URL);
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(row.imageBlurDataUrl).toBe(imageBlurDataUrl);
    const picture = await fetch(image, {
      headers: { [HTTP.HEADER.ACCEPT]: IMAGE.FORMAT.CONTENT_TYPE },
    });
    expect(picture.status).toBe(HTTP.STATUS.OK);
    expect(picture.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.FORMAT.CONTENT_TYPE
    );
  });

  it("deletes the file a second picture replaces, and the one removed", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const { id } = await prisma.user.create({
      data: { email: `second@${PICTURED}` },
      select: { id: true },
    });
    await put(id, cookie);
    const first = await imageOf(id);
    await put(id, cookie);
    const second = await imageOf(id);
    expect(second).not.toBe(first);
    await expect.poll(() => stored(first), UNTIL_CACHE_CHECKED).toBe(false);
    expect(await stored(second)).toBe(true);
    expect((await removeAvatar(id, cookie)).status).toBe(
      HTTP.STATUS.NO_CONTENT
    );
    expect(await imageOf(id)).toBeNull();
    await expect.poll(() => stored(second), UNTIL_CACHE_CHECKED).toBe(false);
  });

  it("deleting the User deletes their picture", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const { id } = await prisma.user.create({
      data: { email: `deleted@${PICTURED}` },
      select: { id: true },
    });
    await put(id, cookie);
    const key = await imageOf(id);
    expect((await remove([id], cookie)).status).toBe(HTTP.STATUS.OK);
    await expect.poll(() => stored(key), UNTIL_CACHE_CHECKED).toBe(false);
  });

  it("the Session answers a signed link with its blur, never the file's name", async () => {
    const admin = FIXTURE.USER.BACK_OFFICE.ADMIN;
    const { id } = await prisma.user.findUniqueOrThrow({
      where: { email: admin.email },
    });
    try {
      await put(id, await cookieFor(app, admin));
      const key = await imageOf(id);
      // A new sign-in: the cookie cache holds the User as it was signed in.
      const session = await app.request(
        `${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`,
        { headers: { cookie: await cookieFor(app, admin), origin: ORIGIN } }
      );
      const { user } = z
        .object({ user: linkSchema })
        .parse(await session.json());
      expect(user.imageBlurDataUrl).toMatch(BLUR_DATA_URL);
      expect(user.image).not.toBe(key);
      expect(user.image).toContain(`${key}`);
      expect(user.image).toContain(
        `/rs:fit:${IMAGE_SERVER.AVATAR_WIDTH}:0/exp:`
      );
    } finally {
      await removeAvatar(id, await cookieFor(app, admin));
    }
  });
});

// Users edited here, in their own domain so the list's counts hold.
const EDITED = "edit-users-api.test";
const NEW_PASSWORD = "Another-long-password-2";
const onePath = (id: string) => `${LIST}${USER.PATH.ONE.replace(":id", id)}`;
const edit = <T>(id: string, body: T & Json<T>, cookie: string) =>
  app.request(onePath(id), {
    body: stringifyJson(body),
    headers: {
      [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      cookie,
      origin: ORIGIN,
    },
    method: HTTP.METHOD.PATCH,
  });
/** A User with a password and a Laura Membership, signed in once. */
const editable = async (name: string) => {
  const email = `${name}@${EDITED}`;
  await upsertUser(
    prisma,
    { email, memberships: [{ app: App.LAURA, role: Role.USER }], name },
    await hashPassword(FIXTURE.PASSWORD)
  );
  const { id } = await prisma.user.findUniqueOrThrow({
    select: { id: true },
    where: { email },
  });
  return { email, id };
};

describe("editing Users", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: EDITED } } });
  });

  it("renames a User and reads them back", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const { id } = await editable("renamed");
    expect((await edit(id, { name: "Renamed" }, cookie)).status).toBe(
      HTTP.STATUS.OK
    );
    const res = await get(onePath(id), cookie);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(userBodySchema.parse(await res.json()).name).toBe("Renamed");
  });

  it("a new password signs the User in with it and ends their Sessions", async () => {
    const admin = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const user = await editable("new-password");
    await cookieFor(app, user);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    expect(
      (await edit(user.id, { password: NEW_PASSWORD }, admin)).status
    ).toBe(HTTP.STATUS.OK);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await signIn(app, user, { password: NEW_PASSWORD })).status).toBe(
      HTTP.STATUS.OK
    );
  });

  it("answers 403 CANNOT_CHANGE_OWN_ROLE for your own Back Office Role", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const self = await prisma.user.findUniqueOrThrow({
      select: { id: true },
      where: { email: FIXTURE.USER.BACK_OFFICE.ADMIN.email },
    });
    const res = await edit(self.id, { memberships: [] }, cookie);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    const problem = await problemOf(res);
    expect(problem.code).toBe(API.ERROR.CODE.CANNOT_CHANGE_OWN_ROLE);
    expect(problem.detail).toBe("You cannot change your own Role here");
  });

  it("answers 404 for an unknown id", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    expect((await get(onePath("missing-id"), cookie)).status).toBe(
      HTTP.STATUS.NOT_FOUND
    );
  });
});
