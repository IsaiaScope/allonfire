// @module-tag integration

import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import type { AppSettingsTable } from "@allonfire/database/features/auth/access/constants/app-settings";
import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";
import { cookieOf, HOST_AUTH_PATH } from "../../../shared/tests/stub-auth";
import { createAuth } from "../auth";

/** The table the next request reads; null: the real `ACCESS.APP_SETTINGS`. */
const current = vi.hoisted((): { table: AppSettingsTable | null } => ({
  table: null,
}));

vi.mock(
  "@allonfire/database/features/auth/access/constants/access",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@allonfire/database/features/auth/access/constants/access")
      >();
    return {
      ...actual,
      ACCESS: {
        ...actual.ACCESS,
        get APP_SETTINGS() {
          return current.table ?? actual.ACCESS.APP_SETTINGS;
        },
      },
    };
  }
);

const BASE_URL = LOCAL.URL.API;
const BASE_PATH = HOST_AUTH_PATH;
const ORIGIN = LOCAL.URL.LAURA;
const PASSWORD = "registration-password-1";
const EMAIL_DOMAIN = "@registration.allonfire.test";
const TOKEN_COOKIE = `${AUTH.COOKIE.MARKER}session_token=`;
const DATA_COOKIE = `${AUTH.COOKIE.SESSION_DATA}=`;

/** Both Apps open, so registering and joining can be watched. */
const open: AppSettingsTable = {
  [App.BACK_OFFICE]: { minRole: Role.USER, registration: Role.USER },
  [App.LAURA]: { minRole: Role.VIEWER, registration: Role.VIEWER },
};
/** The settings the Apps ship with: every App closed. */
const closed: AppSettingsTable = ACCESS.APP_SETTINGS;

const auth = createAuth({
  basePath: BASE_PATH,
  baseURL: BASE_URL,
  secret: "x".repeat(32),
  trustedOrigins: [ORIGIN],
});

const errorBody = z.object({ code: z.string() });

let sequence = 0;
const nextEmail = () => {
  sequence += 1;
  return `user-${Date.now()}-${sequence}${EMAIL_DOMAIN}`;
};

/** Sends one request while `settings` is the App settings table. */
const post = (
  settings: AppSettingsTable,
  path: string,
  body: object,
  headers: Record<string, string> = {}
) => {
  current.table = settings;
  return auth.handler(
    new Request(`${BASE_URL}${BASE_PATH}${path}`, {
      body: stringifyJson(body),
      headers: {
        [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
        origin: ORIGIN,
        ...headers,
      },
      method: "POST",
    })
  );
};

const signUp = (settings: AppSettingsTable, email: string, app?: string) =>
  post(
    settings,
    AUTH.PATH.SIGN_UP_EMAIL,
    { email, name: "New", password: PASSWORD },
    app ? { [AUTH.HEADER.APP]: app } : {}
  );

const signIn = (settings: AppSettingsTable, email: string, app?: string) =>
  post(
    settings,
    AUTH.PATH.SIGN_IN_EMAIL,
    { email, password: PASSWORD },
    app ? { [AUTH.HEADER.APP]: app } : {}
  );

/** Session cookies that still carry a value; a cleared one has none. */
const liveSessionCookies = (res: Response) =>
  res.headers
    .getSetCookie()
    .filter(
      (cookie) =>
        (cookie.startsWith(TOKEN_COOKIE) || cookie.startsWith(DATA_COOKIE)) &&
        !cookie.startsWith(`${TOKEN_COOKIE};`) &&
        !cookie.startsWith(`${DATA_COOKIE};`)
    );

const membershipsOf = (email: string) =>
  prisma.membership.findMany({
    orderBy: { app: "asc" },
    select: { app: true, role: true },
    where: { user: { email } },
  });

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
  });
  await prisma.$disconnect();
});

describe("Registration", () => {
  it("creates the User with one Membership: the App, at its Registration Role", async () => {
    const email = nextEmail();
    const res = await signUp(open, email, App.LAURA);
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
    ]);
  });

  it("takes the User back out when their Membership cannot be written", async () => {
    const email = nextEmail();
    const insert = vi
      .spyOn(prisma.membership, "create")
      .mockRejectedValueOnce(new Error("database went away"));
    const res = await signUp(open, email, App.LAURA);
    insert.mockRestore();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(liveSessionCookies(res)).toEqual([]);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
    // The email is free again: the retry registers.
    expect((await signUp(open, email, App.LAURA)).status).toBe(200);
  });

  it.each([
    ["a closed App", App.BACK_OFFICE],
    ["the stored spelling", "back-office"],
    ["an unknown App", "social"],
    ["no App", undefined],
  ])("refuses %s with 403 and writes nothing", async (_, app) => {
    const email = nextEmail();
    const res = await signUp(closed, email, app);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH.ERROR_CODE.REGISTRATION_CLOSED
    );
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it("refuses a closed App before saying an email is taken", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    const res = await signUp(closed, email, App.LAURA);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH.ERROR_CODE.REGISTRATION_CLOSED
    );
  });
});

describe("joining another App", () => {
  it("adds a Membership at that App's Registration Role", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await post(
      open,
      AUTH.PATH.JOIN_APP,
      {},
      { cookie, [AUTH.HEADER.APP]: App.BACK_OFFICE }
    );
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
      { app: App.BACK_OFFICE, role: Role.USER },
    ]);
  });

  it("never changes the Role in an App the User already belongs to", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    await prisma.membership.updateMany({
      data: { role: Role.ADMIN },
      where: { app: App.LAURA, user: { email } },
    });
    const res = await post(
      open,
      AUTH.PATH.JOIN_APP,
      {},
      { cookie, [AUTH.HEADER.APP]: App.LAURA }
    );
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.ADMIN },
    ]);
  });

  it("refuses a closed App with 403", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await post(
      closed,
      AUTH.PATH.JOIN_APP,
      {},
      { cookie, [AUTH.HEADER.APP]: App.BACK_OFFICE }
    );
    expect(res.status).toBe(403);
    expect(await membershipsOf(email)).toHaveLength(1);
  });

  it("needs a Session", async () => {
    const res = await post(
      open,
      AUTH.PATH.JOIN_APP,
      {},
      { [AUTH.HEADER.APP]: App.LAURA }
    );
    expect(res.status).toBe(401);
  });
});

describe("sign-in naming an App", () => {
  it("refuses a User the App does not let in, leaving no Session behind", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    await prisma.session.deleteMany({ where: { user: { email } } });
    const res = await signIn(closed, email, App.BACK_OFFICE);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH.ERROR_CODE.APP_FORBIDDEN
    );
    expect(liveSessionCookies(res)).toEqual([]);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });

  it("never writes the Session of a User the App does not let in", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    const written = vi.spyOn(prisma.session, "create");
    const res = await signIn(closed, email, App.BACK_OFFICE);
    expect(res.status).toBe(403);
    expect(written).not.toHaveBeenCalled();
  });

  it("refuses an unknown App with 403", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    expect((await signIn(closed, email, "back-office")).status).toBe(403);
  });

  it("lets in a User the App admits, and anyone when no App is named", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    expect((await signIn(closed, email, App.LAURA)).status).toBe(200);
    expect((await signIn(closed, email)).status).toBe(200);
  });

  it("hands the Session out with the User's Memberships", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    current.table = open;
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${AUTH.PATH.GET_SESSION}`, {
        headers: { cookie },
      })
    );
    const body = z
      .object({ user: z.object({ memberships: z.array(z.looseObject({})) }) })
      .parse(await res.json());
    expect(body.user.memberships).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
    ]);
  });
});
