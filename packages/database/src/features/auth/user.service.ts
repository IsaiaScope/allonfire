import { Prisma } from "../../../generated/prisma/client";
import type { App, Role } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import {
  type AccessMembership,
  type AccessUser,
  accessUserFrom,
} from "./access/access";

/** A User's stored picture: its file's name, and the blur shown while it loads. */
export type UserPicture = { image: string; blurDataUrl: string };

/** A User as a list shows them: who, since when, and their Role in each App. */
export type UserRecord = {
  id: string;
  email: string;
  /** What they are called, when they gave a name. */
  name: string | null;
  /** Their picture's address, when they have one. */
  image: string | null;
  /** The blur shown while their stored picture loads; none for any other. */
  imageBlurDataUrl: string | null;
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
  imageBlurDataUrl: true,
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
 * Sets `picture` as the User's (an Avatar's file name and its blur, or null
 * for none, which clears both) and answers the file it held before, read
 * under a row lock in the same transaction, so the caller can delete a file
 * it replaced; null when no User has `id`.
 */
export const setUserImage = (
  id: string,
  picture: UserPicture | null
): Promise<{ previous: string | null } | null> =>
  prisma.$transaction(async (tx) => {
    // Locked till the write: a picture set at the same time waits and reads
    // this one's file as its previous, so each replaced file is answered once.
    const [user] = await tx.$queryRaw<{ image: string | null }[]>`
      SELECT "image" FROM auth."User" WHERE "id" = ${id} FOR UPDATE`;
    if (!user) {
      return null;
    }
    await tx.user.update({
      data: {
        image: picture?.image ?? null,
        imageBlurDataUrl: picture?.blurDataUrl ?? null,
      },
      where: { id },
    });
    return { previous: user.image };
  });

/** The pictures the Users named hold, skipping those with none and unknown ids. */
export const userImages = async (ids: readonly string[]): Promise<string[]> =>
  (
    await prisma.user.findMany({
      select: { image: true },
      where: { id: { in: [...ids] }, image: { not: null } },
    })
  ).flatMap(({ image }) => (image ? [image] : []));

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

/** One User as the list shows them; null for an unknown id. */
export const readUser = (id: string): Promise<UserRecord | null> =>
  prisma.user.findUnique({ select: userRecord, where: { id } });

/**
 * What an edit changes; a field left out stays as it is. `memberships` is
 * the whole set, replacing the User's.
 */
export type UserChange = {
  name?: string;
  memberships?: readonly AccessMembership[];
  /** A new password, hashed as Better Auth hashes it. */
  hashedPassword?: string;
};

/** Better Auth's provider id for a password login. */
const CREDENTIAL = "credential";

/**
 * Edits a User, all or nothing, and answers them as `readUser` does; null
 * for an unknown id, nothing written. A new password goes on their
 * `credential` Account, created for a User who signed in only through a
 * provider, and ends every Session of theirs but `keepSessionId` (the
 * caller's own, when they edit themselves): whoever held the old one is out.
 */
export const updateUser = (
  id: string,
  { hashedPassword, memberships, name }: UserChange,
  { keepSessionId }: { keepSessionId?: string | undefined } = {}
): Promise<UserRecord | null> =>
  prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!user) {
      return null;
    }
    if (name !== undefined) {
      await tx.user.update({ data: { name }, where: { id } });
    }
    if (memberships) {
      await tx.membership.deleteMany({ where: { userId: id } });
      await tx.membership.createMany({
        data: memberships.map((membership) => ({ ...membership, userId: id })),
      });
    }
    if (hashedPassword !== undefined) {
      // No compound unique on (userId, providerId): found, then written.
      const credential = await tx.account.findFirst({
        select: { id: true },
        where: { providerId: CREDENTIAL, userId: id },
      });
      await (credential
        ? tx.account.update({
            data: { password: hashedPassword },
            where: { id: credential.id },
          })
        : tx.account.create({
            data: {
              accountId: id,
              password: hashedPassword,
              providerId: CREDENTIAL,
              userId: id,
            },
          }));
      await tx.session.deleteMany({
        where: {
          userId: id,
          ...(keepSessionId && { id: { not: keepSessionId } }),
        },
      });
    }
    return tx.user.findUnique({ select: userRecord, where: { id } });
  });

/**
 * Whether the Session is still in the database and not expired, read now:
 * a cookie's signed copy outlives a Session deleted by a new password.
 */
export const sessionAlive = async (id: string): Promise<boolean> =>
  (await prisma.session.count({
    where: { expiresAt: { gt: new Date() }, id },
  })) === 1;

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
          providerId: CREDENTIAL,
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
