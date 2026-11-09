import { objectValues } from "@allonfire/core/shared/utils/object";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../../generated/prisma/client";
import { upsertUser } from "../utils/upsert-user";
import { FIXTURE } from "./fixtures";
import type { FixtureImage } from "./images";

/** An Image Fixture's row; the Fixture is the whole truth for it, placements included. */
async function upsertImage(
  client: PrismaClient,
  { apps, source: _source, ...image }: FixtureImage
) {
  const { id } = await client.image.upsert({
    create: image,
    update: image,
    where: { key: image.key },
  });
  await client.$transaction([
    client.imageApp.deleteMany({ where: { imageId: id } }),
    client.imageApp.createMany({
      data: apps.map((app) => ({ app, imageId: id })),
    }),
  ]);
}

/** The MAIL provider every Test database has on; its row exists from the changelog. */
const enableMailProvider = (client: PrismaClient) =>
  client.mailProvider.updateMany({
    data: { enabled: true, fromAddress: FIXTURE.MAIL_PROVIDER.fromAddress },
    where: { slot: FIXTURE.MAIL_PROVIDER.slot },
  });

/** Every Fixture into `client`'s database; safe to run again. */
export async function seedFixtures(client: PrismaClient): Promise<void> {
  // One hash for every Fixture User: same password, and hashing is the slow part.
  const hash = await hashPassword(FIXTURE.PASSWORD);
  const images: FixtureImage[] = objectValues(FIXTURE.IMAGE);
  await Promise.all([
    ...FIXTURE.USERS.map((user) => upsertUser(client, user, hash)),
    ...images.map((image) => upsertImage(client, image)),
    enableMailProvider(client),
  ]);
}
