import { App, Role } from "@allonfire/database/enums";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { upsertUser } from "@allonfire/database/features/seed/utils/upsert-user";
import { hashPassword } from "better-auth/crypto";
import { cookieFor, type TestApp } from "./sign-in";

type Memberships = Parameters<typeof upsertUser>[1]["memberships"];

/** A User with the Fixtures' password and these Memberships, made or reset. */
export const seedUser = async (
  email: string,
  name: string,
  memberships: Memberships
) => {
  await upsertUser(
    prisma,
    { email, memberships, name },
    await hashPassword(FIXTURE.PASSWORD)
  );
  return { email };
};

/** A Back Office Admin with the Fixtures' password, made or reset. */
export const seedAdmin = (email: string, name: string) =>
  seedUser(email, name, [{ app: App.BACK_OFFICE, role: Role.ADMIN }]);

/** The cookie of a Back Office Admin made a User after signing in. */
export const demotedAdminCookie = async (app: TestApp, email: string) => {
  const cookie = await cookieFor(app, await seedAdmin(email, "demoted"));
  await prisma.membership.updateMany({
    data: { role: Role.USER },
    where: { app: App.BACK_OFFICE, user: { email } },
  });
  return cookie;
};

/** The id of the User signed up with `email`. */
export const userIdOf = async ({ email }: { email: string }) =>
  (
    await prisma.user.findUniqueOrThrow({
      select: { id: true },
      where: { email },
    })
  ).id;
