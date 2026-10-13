// @module-tag integration
import { randomUUID } from "node:crypto";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { cookieOf } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
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
const CHANGED = "changed-password-1";

// A fresh app per test, so its in-memory auth limit never trips.
let app: TestApp;
beforeEach(() => {
  app = createApp(appDeps({ auth }));
});

beforeAll(async () => {
  await upsertUser(
    prisma,
    {
      ...user,
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
      name: "changer",
    },
    await hashPassword(FIXTURE.PASSWORD)
  );
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
    headers: { "content-type": HTTP.CONTENT_TYPE.JSON, cookie, origin: ORIGIN },
    method: "POST",
  });

describe("change-password", () => {
  it("takes the right current password; then the new one signs in and the old does not", async () => {
    const cookie = await cookieFor(app, user);
    expect(
      (await changePassword(cookie, FIXTURE.PASSWORD, CHANGED)).status
    ).toBe(200);
    expect((await signIn(app, user, { password: CHANGED })).status).toBe(200);
    expect((await signIn(app, user)).status).toBe(401);
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
    expect(res.status).toBe(400);
    expect((await signIn(app, user, { password: CHANGED })).status).toBe(200);
  });

  it("keeps the User's other Sessions (revokeOtherSessions not sent)", async () => {
    const first = cookieOf(await signIn(app, user, { password: CHANGED }));
    const second = cookieOf(await signIn(app, user, { password: CHANGED }));
    expect(
      (await changePassword(first, CHANGED, "changed-password-2")).status
    ).toBe(200);
    expect(await getSession(app, tokenOnly(second))).not.toBeNull();
  });
});
