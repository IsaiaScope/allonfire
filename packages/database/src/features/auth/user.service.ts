import { checkVersion } from "@allonfire/core/features/version/utils/resource-changed-error";
import { Prisma } from "../../../generated/prisma/client";
import type { App, Role } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import {
  type AccessMembership,
  type AccessUser,
  accessUserFrom,
} from "./access/access";
import { lockUser, userVersion } from "./user-version";
import { replaceMemberships, setPasswordLogin } from "./utils/user-writes";

/** A User's stored picture: its file's name, and the blur shown while it loads. */
export type UserPicture = { image: string; imageBlurDataUrl: string };

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
  /** Their Version (`userVersion`): an edit must carry it to be written. */
  version: string;
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
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

/** A User as read, their `updatedAt` turned into their Version. */
const toRecord = ({
  updatedAt,
  ...user
}: Prisma.UserGetPayload<{ select: typeof userRecord }>): UserRecord => ({
  ...user,
  version: userVersion({ memberships: user.memberships, updatedAt }),
});

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
  return { total, users: users.map(toRecord) };
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
 * it replaced; null when no User has `id`. `expectedVersion` is the Version
 * the change was made on: when the User changed since, it throws
 * `ResourceChangedError` and nothing is written.
 */
export const setUserImage = (
  id: string,
  picture: UserPicture | null,
  { expectedVersion }: { expectedVersion: string }
): Promise<{ previous: string | null } | null> =>
  prisma.$transaction(async (tx) => {
    // Locked till the write: a picture set at the same time on the same
    // Version waits, then finds a new one and is refused, so each replaced
    // file is answered once.
    const user = await lockUser(tx, id);
    if (!user) {
      return null;
    }
    checkVersion(expectedVersion, user.version);
    await tx.user.update({
      data: {
        image: picture?.image ?? null,
        imageBlurDataUrl: picture?.imageBlurDataUrl ?? null,
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
export const readUser = async (id: string): Promise<UserRecord | null> => {
  const user = await prisma.user.findUnique({
    select: userRecord,
    where: { id },
  });
  return user && toRecord(user);
};

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

/**
 * Edits a User, all or nothing, and answers them as `readUser` does; null
 * for an unknown id, nothing written. `expectedVersion` is the Version the
 * edit was made on: when the User changed since, it throws
 * `ResourceChangedError` and nothing is written, so a form never overwrites what it did not show. The
 * row stays locked from that check to the last write. A new password goes on their
 * `credential` Account, created for a User who signed in only through a
 * provider, and ends every Session of theirs but `keepSessionId` (the
 * caller's own, when they edit themselves): whoever held the old one is out.
 */
export const updateUser = (
  id: string,
  { hashedPassword, memberships, name }: UserChange,
  {
    expectedVersion,
    keepSessionId,
  }: { expectedVersion: string; keepSessionId?: string | undefined }
): Promise<UserRecord | null> =>
  prisma.$transaction(async (tx) => {
    // Locked till the last write: an edit landing at the same time waits,
    // then reads this one's result as a change it did not see.
    const locked = await lockUser(tx, id);
    if (!locked) {
      return null;
    }
    checkVersion(expectedVersion, locked.version);
    if (name !== undefined) {
      await tx.user.update({ data: { name }, where: { id } });
    }
    if (memberships) {
      await replaceMemberships(tx, id, memberships);
    }
    if (hashedPassword !== undefined) {
      await setPasswordLogin(tx, id, hashedPassword);
      await tx.session.deleteMany({
        where: {
          userId: id,
          ...(keepSessionId && { id: { not: keepSessionId } }),
        },
      });
    }
    return toRecord(
      await tx.user.findUniqueOrThrow({ select: userRecord, where: { id } })
    );
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
 * Adds a User with a password login and their Memberships, all or nothing,
 * and answers their id and Version (what a picture set next carries). The
 * email is stored trimmed and lowercased, as Better Auth stores it, so the
 * unique email holds whatever case was typed. Already verified: an Admin
 * vouches for it.
 */
export const createUser = async (
  { email, memberships, name }: NewUser,
  hashedPassword: string
): Promise<{ id: string; version: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          emailVerified: true,
          memberships: { create: [...memberships] },
          name,
        },
        select: {
          id: true,
          memberships: { select: { app: true, role: true } },
          updatedAt: true,
        },
      });
      const { id } = created;
      await setPasswordLogin(tx, id, hashedPassword);
      return { id, version: userVersion(created) };
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
