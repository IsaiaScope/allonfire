import { Prisma } from "../../../generated/prisma/client";
import type { App, Role } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import {
  type AccessMembership,
  type AccessUser,
  accessUserFrom,
} from "./access/access";

/** A User as a list shows them: who, since when, and their Role in each App. */
export type UserRecord = {
  id: string;
  email: string;
  /** What they are called, when they gave a name. */
  name: string | null;
  /** Their picture's address, when they have one. */
  image: string | null;
  createdAt: Date;
  memberships: AccessMembership[];
};

/**
 * One page of Users. `app` and `role` together match one Membership, in any
 * of the Apps with any of the Roles; `role` alone matches it in any App, and
 * an empty list asks nothing. `text` is part of the email or of the name,
 * any case.
 */
export type UserListQuery = {
  app?: readonly App[] | undefined;
  role?: readonly Role[] | undefined;
  text: string;
  page: number;
  perPage: number;
};

const userRecord = {
  createdAt: true,
  email: true,
  id: true,
  image: true,
  memberships: { orderBy: { app: "asc" }, select: { app: true, role: true } },
  name: true,
} as const satisfies Prisma.UserSelect;

/**
 * The Users matching `query`, newest first, and how many match in all. The id
 * breaks a tie in `createdAt`, so a page never repeats or skips a User. A
 * User with no Membership matches only while no App or Role is asked for.
 */
export const listUsers = async ({
  app,
  page,
  perPage,
  role,
  text,
}: UserListQuery): Promise<{ users: UserRecord[]; total: number }> => {
  const where = {
    ...(text && {
      OR: [
        { email: { contains: text, mode: "insensitive" } },
        { name: { contains: text, mode: "insensitive" } },
      ],
    }),
    ...((app?.length || role?.length) && {
      memberships: {
        some: {
          ...(app?.length && { app: { in: [...app] } }),
          ...(role?.length && { role: { in: [...role] } }),
        },
      },
    }),
  } satisfies Prisma.UserWhereInput;
  // Two reads, not a transaction: under READ COMMITTED each takes its own
  // snapshot either way.
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: userRecord,
      skip: (page - 1) * perPage,
      take: perPage,
      where,
    }),
  ]);
  return { total, users };
};

/**
 * Deletes the Users named, with everything they hold: the database's
 * cascades remove their Memberships, Sessions, Accounts and Laura scores, and
 * leave their Images without an uploader. An unknown id is skipped. Returns
 * how many were deleted.
 */
export const deleteUsers = async (ids: readonly string[]): Promise<number> =>
  (await prisma.user.deleteMany({ where: { id: { in: [...ids] } } })).count;

/**
 * A User's Memberships as the database holds them now, never a cached
 * Session's copy; null once the User is gone.
 */
export const accessUserById = async (
  id: string
): Promise<AccessUser | null> => {
  const user = await prisma.user.findUnique({
    select: { memberships: { select: { app: true, role: true } } },
    where: { id },
  });
  return user && accessUserFrom(user);
};

/** A User an Admin adds: who they are, and their Role in each App they join. */
export type NewUser = {
  email: string;
  name: string;
  memberships: readonly AccessMembership[];
};

/** The email asked for already belongs to a User. */
export class EmailTakenError extends Error {
  override name = "EmailTakenError";
}

/** Prisma's code for a unique constraint the write would break. */
const UNIQUE_VIOLATION = "P2002";

/**
 * Adds a User with a password login and their Memberships, all or nothing.
 * The email is stored trimmed and lowercased, as Better Auth stores it, so
 * the unique email holds whatever case was typed. Already verified: an
 * Admin vouches for it.
 */
export const createUser = async (
  { email, memberships, name }: NewUser,
  hashedPassword: string
): Promise<{ id: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const { id } = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          emailVerified: true,
          memberships: { create: [...memberships] },
          name,
        },
        select: { id: true },
      });
      await tx.account.create({
        data: {
          accountId: id,
          password: hashedPassword,
          providerId: "credential",
          userId: id,
        },
      });
      return { id };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      throw new EmailTakenError("Email already taken", { cause: error });
    }
    throw error;
  }
};
