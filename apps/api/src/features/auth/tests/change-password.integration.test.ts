// @module-tag integration
import { randomUUID } from "node:crypto";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { cookieOf } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { seedAdmin } from "../../../shared/tests/seed-user";
import {
  cookieFor,
  getSession,
  ORIGIN,
  signIn,
  type TestApp,
  tokenOnly,
} from "../../../shared/tests/sign-in";
import { auth } from "../auth";

// A User of its own: changing a Fixture's password would break the tests
// beside it. The tests run in file order on it.
const user = { email: `change-password-${randomUUID()}@allonfire.test` };
const CHANGED = FIXTURE.NEW_PASSWORD;

// A fresh app per test, so its in-memory auth limit never trips.
let app: TestApp;
beforeEach(() => {
  app = createApp(appDeps({ auth }));
});

beforeAll(async () => {
  await seedAdmin(user.email, "changer");
});

afterAll(async () => {
  await prisma.$disconnect();
});

const changePassword = (
  cookie: string,
  currentPassword: string,
  newPassword: string
) =>
  app.request(`${API.PATH.AUTH}${AUTH.PATH.CHANGE_PASSWORD}`, {
    body: stringifyJson({ currentPassword, newPassword }),
    headers: {
      [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      cookie,
      origin: ORIGIN,
    },
    method: HTTP.METHOD.POST,
  });

describe("change-password", () => {
  it("takes the right current password; then the new one signs in and the old does not", async () => {
    const cookie = await cookieFor(app, user);
    expect(
      (await changePassword(cookie, FIXTURE.PASSWORD, CHANGED)).status
    ).toBe(HTTP.STATUS.OK);
    expect((await signIn(app, user, { password: CHANGED })).status).toBe(
      HTTP.STATUS.OK
    );
    expect((await signIn(app, user)).status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  it("refuses a wrong current password and keeps the old one", async () => {
    const cookie = tokenOnly(
      cookieOf(await signIn(app, user, { password: CHANGED }))
    );
    const res = await changePassword(
      cookie,
      "wrong-password-1",
      "never-1-applied"
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await signIn(app, user, { password: CHANGED })).status).toBe(
      HTTP.STATUS.OK
    );
  });

  it("keeps the User's other Sessions (revokeOtherSessions not sent)", async () => {
    const first = cookieOf(await signIn(app, user, { password: CHANGED }));
    const second = cookieOf(await signIn(app, user, { password: CHANGED }));
    expect(
      (await changePassword(first, CHANGED, "changed-password-2")).status
    ).toBe(HTTP.STATUS.OK);
    expect(await getSession(app, tokenOnly(second))).not.toBeNull();
  });
});
