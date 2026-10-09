// @module-tag integration
import {
  CONTENT_TYPE,
  HTTP_HEADER,
} from "@allonfire/core/features/http/constants/http";

import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import {
  APP_SETTINGS,
  type AppSettingsTable,
} from "@allonfire/database/features/auth/access/constants/app-settings";
import { z } from "zod";
import { AUTH_ERROR_CODE } from "../../../shared/constants/errors";
import { APP_HEADER } from "../../../shared/constants/headers";
import {
  JOIN_APP_PATH,
  SIGN_IN_EMAIL_PATH,
  SIGN_UP_EMAIL_PATH,
} from "../../../shared/constants/paths";
import { createAuth } from "../auth";

/** The table the next request reads; null: the real `APP_SETTINGS`. */
const current = vi.hoisted((): { table: AppSettingsTable | null } => ({
  table: null,
}));

vi.mock(
  "@allonfire/database/features/auth/access/constants/app-settings",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@allonfire/database/features/auth/access/constants/app-settings")
      >();
    return {
      ...actual,
      get APP_SETTINGS() {
        return current.table ?? actual.APP_SETTINGS;
      },
    };
  }
);

const BASE_URL = "http://localhost:3300";
const BASE_PATH = "/v1/auth";
const ORIGIN = "http://localhost:3200";
const PASSWORD = "registration-password-1";
const EMAIL_DOMAIN = "@registration.allonfire.test";
const TOKEN_COOKIE = "better-auth.session_token=";
const DATA_COOKIE = "better-auth.session_data=";

/** Both Apps open, so registering and joining can be watched. */
const open: AppSettingsTable = {
  [App.BACK_OFFICE]: { minRole: Role.USER, registration: Role.USER },
  [App.LAURA]: { minRole: Role.VIEWER, registration: Role.VIEWER },
};
/** The settings the Apps ship with: every App closed. */
const closed: AppSettingsTable = APP_SETTINGS;

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
        [HTTP_HEADER.CONTENT_TYPE]: CONTENT_TYPE.JSON,
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
    SIGN_UP_EMAIL_PATH,
    { email, name: "New", password: PASSWORD },
    app ? { [APP_HEADER]: app } : {}
  );

const signIn = (settings: AppSettingsTable, email: string, app?: string) =>
  post(
    settings,
    SIGN_IN_EMAIL_PATH,
    { email, password: PASSWORD },
    app ? { [APP_HEADER]: app } : {}
  );

/** The cookies a response set, as a request sends them back. */
const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

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

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (cause) {
    throw new Error(
      "Postgres unavailable — run: pnpm docker:up && pnpm db:update",
      { cause }
    );
  }
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
      AUTH_ERROR_CODE.REGISTRATION_CLOSED
    );
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it("refuses a closed App before saying an email is taken", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    const res = await signUp(closed, email, App.LAURA);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH_ERROR_CODE.REGISTRATION_CLOSED
    );
  });
});

describe("joining another App", () => {
  it("adds a Membership at that App's Registration Role", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await post(
      open,
      JOIN_APP_PATH,
      {},
      { cookie, [APP_HEADER]: App.BACK_OFFICE }
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
      JOIN_APP_PATH,
      {},
      { cookie, [APP_HEADER]: App.LAURA }
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
      JOIN_APP_PATH,
      {},
      { cookie, [APP_HEADER]: App.BACK_OFFICE }
    );
    expect(res.status).toBe(403);
    expect(await membershipsOf(email)).toHaveLength(1);
  });

  it("needs a Session", async () => {
    const res = await post(
      open,
      JOIN_APP_PATH,
      {},
      { [APP_HEADER]: App.LAURA }
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
      AUTH_ERROR_CODE.APP_FORBIDDEN
    );
    expect(liveSessionCookies(res)).toEqual([]);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });

  it.each([["an unknown App", "back-office"]])(
    "refuses %s with 403",
    async (_, app) => {
      const email = nextEmail();
      await signUp(open, email, App.LAURA);
      expect((await signIn(closed, email, app)).status).toBe(403);
    }
  );

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
      new Request(`${BASE_URL}${BASE_PATH}/get-session`, {
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
