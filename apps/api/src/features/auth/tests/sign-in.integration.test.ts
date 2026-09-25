// @module-tag integration

import { requireRole } from "@allonfire/auth/hono/middleware/require-role";
import { prisma } from "@allonfire/database";
import { AllowedApp, Role } from "@allonfire/database/enums";
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
  "/v1/mutate",
  requireRole(Role.USER),
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
      allowedApps: [AllowedApp.LAURA],
      email: EMAIL,
      emailVerified: true,
      name: "Integration",
      role: Role.VIEWER,
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

async function signIn(): Promise<string> {
  const res = await app.request("/v1/auth/sign-in/email", {
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    headers: { "content-type": "application/json", origin: ORIGIN },
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
  it("returns a Session carrying role and allowed apps", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/auth/get-session", {
      headers: { cookie },
    });
    const body = z.object({ user: z.looseObject({}) }).parse(await res.json());
    expect(body.user).toMatchObject({
      allowedApps: [AllowedApp.LAURA],
      email: EMAIL,
      role: Role.VIEWER,
    });
  });

  it("refuses a real Viewer Session at requireRole(USER)", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/mutate", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("does not let a request create a User", async () => {
    const res = await app.request("/v1/auth/sign-up/email", {
      body: JSON.stringify({
        email: SIGN_UP_EMAIL,
        name: "x",
        password: PASSWORD,
      }),
      headers: { "content-type": "application/json", origin: ORIGIN },
      method: "POST",
    });
    expect(res.ok).toBe(false);
    expect(await prisma.user.count({ where: { email: SIGN_UP_EMAIL } })).toBe(
      0
    );
  });
});
