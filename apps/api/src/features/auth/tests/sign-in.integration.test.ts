// @module-tag integration

import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import { APP_HEADER } from "@allonfire/auth/shared/constants/headers";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
import { auth } from "../auth";

const EMAIL = "sign-in-integration@allonfire.test";
const SIGN_UP_EMAIL = "sign-up-integration@allonfire.test";
const PASSWORD = "integration-password-1";
const ORIGIN = "http://localhost:3200";

const app = createApp(appDeps({ auth })).get(
  "/v1/back-office",
  requireApp(App.BACK_OFFICE),
  (c) => c.text("ok")
);

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (cause) {
    throw new Error(
      "Postgres unavailable — run: pnpm docker:up && pnpm --filter @allonfire/database db:update",
      { cause }
    );
  }
  const user = await prisma.user.upsert({
    create: {
      email: EMAIL,
      emailVerified: true,
      memberships: { create: { app: App.LAURA, role: Role.VIEWER } },
      name: "Integration",
    },
    update: {},
    where: { email: EMAIL },
  });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.account.create({
    data: {
      accountId: user.id,
      password: await hashPassword(PASSWORD),
      providerId: "credential",
      userId: user.id,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [EMAIL, SIGN_UP_EMAIL] } },
  });
  await prisma.$disconnect();
});

async function signIn(appName?: string): Promise<string> {
  const res = await app.request("/v1/auth/sign-in/email", {
    body: stringifyJson({ email: EMAIL, password: PASSWORD }),
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      ...(appName && { [APP_HEADER]: appName }),
    },
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`sign-in answered ${res.status}`);
  }
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

describe("sign-in against Postgres", () => {
  it("returns a Session carrying the User's Memberships", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/auth/get-session", {
      headers: { cookie },
    });
    const body = z.object({ user: z.looseObject({}) }).parse(await res.json());
    expect(body.user).toMatchObject({
      email: EMAIL,
      memberships: [{ app: App.LAURA, role: Role.VIEWER }],
    });
  });

  it("refuses a Laura Viewer at requireApp(BACK_OFFICE)", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/back-office", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("refuses a sign-in naming the Back office, and opens no Session", async () => {
    await prisma.session.deleteMany({ where: { user: { email: EMAIL } } });
    const res = await app.request("/v1/auth/sign-in/email", {
      body: stringifyJson({ email: EMAIL, password: PASSWORD }),
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        [APP_HEADER]: App.BACK_OFFICE,
      },
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect(
      await prisma.session.count({ where: { user: { email: EMAIL } } })
    ).toBe(0);
  });

  it.each([
    ["for the Back office", { [APP_HEADER]: App.BACK_OFFICE }],
    ["naming no App", {}],
  ])("does not let a request create a User %s", async (_, appHeader) => {
    const res = await app.request("/v1/auth/sign-up/email", {
      body: stringifyJson({
        email: SIGN_UP_EMAIL,
        name: "x",
        password: PASSWORD,
      }),
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        ...appHeader,
      },
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect(await prisma.user.count({ where: { email: SIGN_UP_EMAIL } })).toBe(
      0
    );
  });
});
