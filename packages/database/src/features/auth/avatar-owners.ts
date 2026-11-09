import type { App } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";

/** A picture a User has, by its `User.image` value, and the Apps its owner is a member of. */
export type AvatarOwner = { apps: App[]; image: string };

/**
 * Every User who has a picture, whatever it is (our own Avatar's file name or
 * a provider's address: the caller tells them apart), with their Apps. For
 * the Storage overview, whose route guards who may ask.
 */
export async function avatarOwners(): Promise<AvatarOwner[]> {
  const users = await prisma.user.findMany({
    select: { image: true, memberships: { select: { app: true } } },
    where: { image: { not: null } },
  });
  return users.flatMap(({ image, memberships }) =>
    image ? [{ apps: memberships.map(({ app }) => app), image }] : []
  );
}
