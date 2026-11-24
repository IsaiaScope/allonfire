// @module-tag integration

import { randomUUID } from "node:crypto";
import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import {
  authCodeOf,
  cookieFor,
  getSession,
  ORIGIN,
  signIn,
  type TestApp,
  tokenOnly,
} from "../../../shared/tests/sign-in";
import { auth } from "../auth";

const LAURA_USER = FIXTURE.USER.LAURA.USER;
/** Routes only this file mounts, behind each App's door and a Section's higher Role. */
const BACK_OFFICE_ROUTE = `${API.PATH.VERSION}/back-office`;
const LAURA_ROUTE = `${API.PATH.VERSION}/laura`;
const LAURA_ADMIN_ROUTE = `${API.PATH.VERSION}/laura-admin`;
const CLOSED_APPS = objectValues(App).filter(
  (each) => ACCESS.APP_SETTINGS[each].registration === null
);

// A fresh app per test: its in-memory rate-limit store starts empty, so the
// sign-ins in this file never add up to the auth limit.
let app: TestApp;
beforeEach(() => {
  app = createApp(appDeps({ auth }))
    .get(BACK_OFFICE_ROUTE, requireApp(App.BACK_OFFICE), (c) => c.text("ok"))
    .get(LAURA_ROUTE, requireApp(App.LAURA), (c) => c.text("ok"))
    .get(LAURA_ADMIN_ROUTE, requireApp(App.LAURA, Role.ADMIN), (c) =>
      c.text("ok")
    );
});

afterAll(async () => {
  await prisma.$disconnect();
});

const signUp = (email: string, appHeader: Record<string, string>) =>
  app.request(`${API.PATH.AUTH}${AUTH.PATH.SIGN_UP_EMAIL}`, {
    body: stringifyJson({ email, name: "x", password: FIXTURE.PASSWORD }),
    headers: {
      [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      origin: ORIGIN,
      ...appHeader,
    },
    method: HTTP.METHOD.POST,
  });

const joinApp = (headers: Record<string, string>) =>
  app.request(`${API.PATH.AUTH}${AUTH.PATH.JOIN_APP}`, {
    headers: { origin: ORIGIN, [AUTH.HEADER.APP]: App.BACK_OFFICE, ...headers },
    method: HTTP.METHOD.POST,
  });

describe("sign-in against Postgres", () => {
  it("returns a Session carrying the User's Memberships", async () => {
    const session = await getSession(app, await cookieFor(app, LAURA_USER));
    expect(session?.user).toMatchObject({
      email: LAURA_USER.email,
      memberships: [{ app: App.LAURA, role: Role.USER }],
    });
  });

  it("refuses a Laura User at requireApp(BACK_OFFICE)", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    const res = await app.request(BACK_OFFICE_ROUTE, { headers: { cookie } });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it.each([
    { path: LAURA_ROUTE, status: HTTP.STATUS.OK, user: LAURA_USER },
    {
      path: LAURA_ROUTE,
      status: HTTP.STATUS.FORBIDDEN,
      user: FIXTURE.USER.LAURA.VIEWER,
    },
    {
      path: LAURA_ADMIN_ROUTE,
      status: HTTP.STATUS.FORBIDDEN,
      user: LAURA_USER,
    },
    {
      path: LAURA_ADMIN_ROUTE,
      status: HTTP.STATUS.OK,
      user: FIXTURE.USER.LAURA.ADMIN,
    },
    {
      path: LAURA_ROUTE,
      status: HTTP.STATUS.FORBIDDEN,
      user: FIXTURE.USER.BACK_OFFICE.ADMIN,
    },
  ])("$user.email at $path: $status", async ({ path, status, user }) => {
    const cookie = await cookieFor(app, user);
    expect((await app.request(path, { headers: { cookie } })).status).toBe(
      status
    );
  });

  it.each([
    { status: HTTP.STATUS.OK, user: FIXTURE.USER.BACK_OFFICE.ADMIN },
    { status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.BACK_OFFICE.USER },
    { status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.BACK_OFFICE.VIEWER },
    { status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.NO_MEMBERSHIP },
    { status: HTTP.STATUS.FORBIDDEN, user: LAURA_USER },
  ])(
    "signs $user.email into the Back Office: $status",
    async ({ status, user }) => {
      const userAgent = randomUUID();
      const res = await signIn(app, user, {
        appName: App.BACK_OFFICE,
        userAgent,
      });
      expect(res.status).toBe(status);
      if (status === 403) {
        expect(await authCodeOf(res)).toBe(AUTH.ERROR_CODE.APP_FORBIDDEN);
        expect(await prisma.session.count({ where: { userAgent } })).toBe(0);
      }
    }
  );

  it("answers 401 to a wrong password and to an unknown email", async () => {
    const wrong = await signIn(app, FIXTURE.USER.BACK_OFFICE.ADMIN, {
      password: "wrong-password-1",
    });
    expect(wrong.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect((await signIn(app, { email: "nobody@allonfire.test" })).status).toBe(
      401
    );
  });

  it("returns every Membership with the Session, and nothing after sign-out", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.ADMIN_EVERYWHERE);
    expect((await getSession(app, cookie))?.user.memberships).toHaveLength(
      objectValues(App).length
    );
    await app.request(`${API.PATH.AUTH}${AUTH.PATH.SIGN_OUT}`, {
      headers: { cookie, origin: ORIGIN },
      method: HTTP.METHOD.POST,
    });
    expect(await getSession(app, tokenOnly(cookie))).toBeNull();
  });
});

describe("Registration on the real ACCESS.APP_SETTINGS", () => {
  it.each([
    ...CLOSED_APPS.map(
      (closed) => [closed, { [AUTH.HEADER.APP]: closed }] as const
    ),
    ["no App", {}] as const,
  ])("refuses a User for %s with REGISTRATION_CLOSED", async (name, header) => {
    const email = `closed-${name.replace(" ", "-").toLowerCase()}@registration.allonfire.test`;
    const res = await signUp(email, header);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await authCodeOf(res)).toBe(AUTH.ERROR_CODE.REGISTRATION_CLOSED);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it("refuses joining a closed App and adds no Membership", async () => {
    const res = await joinApp({ cookie: await cookieFor(app, LAURA_USER) });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await authCodeOf(res)).toBe(AUTH.ERROR_CODE.REGISTRATION_CLOSED);
    expect(
      await prisma.membership.count({
        where: { app: App.BACK_OFFICE, user: { email: LAURA_USER.email } },
      })
    ).toBe(0);
  });

  it("refuses a signed-out visitor", async () => {
    expect((await joinApp({})).status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });
});
