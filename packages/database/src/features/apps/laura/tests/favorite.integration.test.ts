// @module-tag integration

import { App } from "../../../../../generated/prisma/enums";
import type { ImagePlacementsById } from "../../../image/image.service";
import {
  deleteImages,
  removeImagesFromApp,
} from "../../../image/image.service";
import { prisma } from "../../../prisma/client";
import { markFavorite, unmarkFavorite } from "../favorite.service";
import { ensureLauraProfile } from "../profile.service";
import { createPhoto, resetScope } from "./laura-test-data";

// Runs against DATABASE_URL. Rows are keyed by the prefix and removed after.
const PREFIX = "favorite-test-";
const UPLOADER = `${PREFIX}uploader`;
const FIRST = `${PREFIX}first`;
const SECOND = `${PREFIX}second`;
const { BACK_OFFICE: OFFICE, LAURA } = App;
const LET_THROUGH = (placements: ImagePlacementsById) => [...placements.keys()];

const SCOPE = { domain: "favorite-service.test", prefix: PREFIX };
const photo = (name: string, apps: App[] = [LAURA]) =>
  createPhoto(SCOPE, { apps, name, uploadedBy: UPLOADER });

/** A User with a Laura Membership and a Profile. */
const member = async (id: string) => {
  await ensureLauraProfile(id);
};

const copiesOf = async (userId: string) =>
  (
    await prisma.profileFavorite.findMany({
      orderBy: { imageId: "asc" },
      select: { imageId: true },
      where: { userId },
    })
  ).map(({ imageId }) => imageId);

const masterRow = (imageId: string) =>
  prisma.favorite.findUnique({ where: { imageId } });

beforeEach(async () => {
  await resetScope(SCOPE, {
    ids: [UPLOADER, FIRST, SECOND],
    members: [FIRST, SECOND],
  });
  await member(FIRST);
  await member(SECOND);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("favorite.service", () => {
  it("marks an Image of Laura: the master and a copy in each existing Profile, with the master's createdAt", async () => {
    const id = await photo("marked");
    expect(await markFavorite(id)).toBe(true);
    const master = await masterRow(id);
    expect(master).not.toBeNull();
    // Other test files' Profiles share this database, so only this file's Users.
    const copies = await prisma.profileFavorite.findMany({
      where: { imageId: id, userId: { in: [FIRST, SECOND] } },
    });
    expect(copies.map(({ userId }) => userId).sort()).toEqual([FIRST, SECOND]);
    expect(copies.map(({ createdAt }) => createdAt)).toEqual([
      master?.createdAt,
      master?.createdAt,
    ]);
  });

  it("marking again keeps one row each and the first createdAt", async () => {
    const id = await photo("twice");
    await markFavorite(id);
    const first = await masterRow(id);
    expect(await markFavorite(id)).toBe(true);
    expect(await prisma.favorite.count({ where: { imageId: id } })).toBe(1);
    expect(
      await prisma.profileFavorite.count({
        where: { imageId: id, userId: { in: [FIRST, SECOND] } },
      })
    ).toBe(2);
    expect(await masterRow(id)).toEqual(first);
  });

  it("answers false and writes nothing for an Image not placed in Laura", async () => {
    const id = await photo("elsewhere", [OFFICE]);
    expect(await markFavorite(id)).toBe(false);
    expect(await masterRow(id)).toBeNull();
    expect(await markFavorite("no-such-image")).toBe(false);
    expect(await copiesOf(FIRST)).not.toContain(id);
  });

  it("unmarking removes the master and every copy, and a second unmark is no error", async () => {
    const id = await photo("unmarked");
    await markFavorite(id);
    await unmarkFavorite(id);
    expect(await masterRow(id)).toBeNull();
    expect(await copiesOf(FIRST)).not.toContain(id);
    expect(await copiesOf(SECOND)).not.toContain(id);
    await expect(unmarkFavorite(id)).resolves.toBeUndefined();
  });

  it("removing the Laura placement removes the master and every copy, and so does deleting the Image", async () => {
    const removed = await photo("removed", [LAURA, OFFICE]);
    const deleted = await photo("deleted");
    await markFavorite(removed);
    await markFavorite(deleted);
    await removeImagesFromApp([removed], LAURA, LET_THROUGH);
    await deleteImages([deleted], LET_THROUGH);
    const left = await prisma.profileFavorite.count({
      where: { imageId: { in: [removed, deleted] } },
    });
    expect(left).toBe(0);
    expect(
      await prisma.favorite.count({
        where: { imageId: { in: [removed, deleted] } },
      })
    ).toBe(0);
  });

  it("answers false, not an error, when the Laura placement is removed while the mark waits", async () => {
    const id = await photo("racing");
    let marking: Promise<boolean> | undefined;
    // The removal holds the Image's row and has deleted the placement, uncommitted.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM image."Image" WHERE "id" = ${id} FOR UPDATE`;
      await tx.imageApp.deleteMany({ where: { app: LAURA, imageId: id } });
      marking = markFavorite(id);
      // The mark has started and is waiting on the removal.
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    await expect(marking).resolves.toBe(false);
    expect(await masterRow(id)).toBeNull();
  });

  it("taking the Image out of the Back Office only keeps the master and the copies", async () => {
    const id = await photo("both", [LAURA, OFFICE]);
    await markFavorite(id);
    await removeImagesFromApp([id], OFFICE, LET_THROUGH);
    expect(await masterRow(id)).not.toBeNull();
    expect(await copiesOf(FIRST)).toContain(id);
  });
});
