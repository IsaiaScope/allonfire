// @module-tag integration

import type { KeysetPosition } from "@allonfire/core/features/search/keyset-cursor";
import { App } from "../../../../../generated/prisma/enums";
import { prisma } from "../../../prisma/client";
import { markFavorite } from "../favorite.service";
import {
  type GalleryPage,
  listFavoritesPage,
  listGalleryPage,
} from "../gallery.service";
import { ensureLauraProfile } from "../profile.service";
import { createPhoto, resetScope } from "./laura-test-data";

// Runs against DATABASE_URL, shared with other test files: every Image is keyed
// by the prefix, and a listing is cut to this file's own rows.
const PREFIX = "gallery-test-";
const UPLOADER = `${PREFIX}uploader`;
const FIRST = `${PREFIX}first`;
const SECOND = `${PREFIX}second`;
const NO_PROFILE = `${PREFIX}no-profile`;
const { BACK_OFFICE: OFFICE, LAURA } = App;
const HOUR_MS = 3_600_000;
const BASE = new Date("2026-11-01T10:00:00.000Z").getTime();
const atHour = (hours: number) => new Date(BASE + hours * HOUR_MS);
// Other test files leave newer rows in the shared database: a short page starts
// just above this file's newest row, so it holds only its own.
const START: KeysetPosition = { at: atHour(100), id: "z" };

const SCOPE = { domain: "gallery-service.test", prefix: PREFIX };
const photo = async (name: string, hours: number, apps: App[] = [LAURA]) => {
  const id = await createPhoto(SCOPE, { apps, name, uploadedBy: UPLOADER });
  await prisma.image.update({
    data: { createdAt: atHour(hours) },
    where: { id },
  });
  return id;
};

/** Marks the Image, then sets when it was marked on the master and every copy. */
const markAt = async (id: string, hours: number) => {
  await markFavorite(id);
  await prisma.favorite.update({
    data: { createdAt: atHour(hours) },
    where: { imageId: id },
  });
  await prisma.profileFavorite.updateMany({
    data: { createdAt: atHour(hours) },
    where: { imageId: id },
  });
};

type Lister = (args: {
  after?: KeysetPosition | undefined;
  limit: number;
  userId: string;
}) => Promise<GalleryPage>;

/** Every page of a listing, cut to this file's Images, as ids in order. */
const everyId = async (list: Lister, userId: string, limit: number) => {
  const ids: string[] = [];
  const flags: boolean[] = [];
  // Pages are asked one after the other: each needs the last one's position.
  const pagesFrom = async (
    after: KeysetPosition | undefined
  ): Promise<GalleryPage[]> => {
    const page = await list({ after, limit, userId });
    return page.next ? [page, ...(await pagesFrom(page.next))] : [page];
  };
  const pages = await pagesFrom(undefined);
  for (const { images } of pages) {
    for (const image of images) {
      if (image.key.startsWith(PREFIX)) {
        ids.push(image.id);
        flags.push(image.favorite);
      }
    }
  }
  return { flags, ids };
};

beforeEach(async () => {
  await resetScope(SCOPE, {
    ids: [UPLOADER, FIRST, SECOND, NO_PROFILE],
    members: [FIRST, SECOND, NO_PROFILE],
  });
  await ensureLauraProfile(FIRST);
  await ensureLauraProfile(SECOND);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listGalleryPage", () => {
  it("lists only Images placed in Laura, newest first, favorite only for the caller's own copy", async () => {
    const old = await photo("old", 1);
    const marked = await photo("marked", 2);
    const newest = await photo("newest", 3);
    await photo("office", 4, [OFFICE]);
    await markAt(marked, 5);
    // A copy only the second User holds must not flag the first User's feed.
    await prisma.profileFavorite.deleteMany({
      where: { imageId: marked, userId: SECOND },
    });
    const first = await everyId(listGalleryPage, FIRST, 50);
    expect(first.ids).toEqual([newest, marked, old]);
    expect(first.flags).toEqual([false, true, false]);
    const second = await everyId(listGalleryPage, SECOND, 50);
    expect(second.flags).toEqual([false, false, false]);
  });

  it("tells when each Image was uploaded, as an Export is named by it", async () => {
    const id = await photo("dated", 7);
    const { images } = await listGalleryPage({ limit: 500, userId: FIRST });
    expect(images.find((image) => image.id === id)?.createdAt).toEqual(
      atHour(7)
    );
  });

  it("pages of limit cover every Image once, and the last next is null", async () => {
    const ids = await Promise.all(
      [1, 2, 3, 4, 5].map((hours) => photo(`p${hours}`, hours))
    );
    const { ids: seen } = await everyId(listGalleryPage, FIRST, 2);
    expect(seen).toEqual([...ids].reverse());
    const last = await listGalleryPage({ limit: 500, userId: FIRST });
    expect(last.next).toBeNull();
  });

  it("an Image added after page 1 never repeats or skips on page 2, and tops a fresh read", async () => {
    const ids = await Promise.all(
      [1, 2, 3, 4].map((hours) => photo(`a${hours}`, hours))
    );
    const pageOne = await listGalleryPage({
      after: START,
      limit: 2,
      userId: FIRST,
    });
    const added = await photo("added", 9);
    const pageTwo = await listGalleryPage({
      after: pageOne.next ?? undefined,
      limit: 2,
      userId: FIRST,
    });
    const own = (page: GalleryPage) =>
      page.images
        .filter(({ key }) => key.startsWith(PREFIX))
        .map(({ id }) => id);
    expect([...own(pageOne), ...own(pageTwo)]).toEqual(
      [...ids].reverse().filter((id) => id !== added)
    );
    const fresh = await listGalleryPage({ limit: 500, userId: FIRST });
    expect(own(fresh)[0]).toBe(added);
  });

  it("an Image removed from Laura at the page boundary changes nothing about the next page", async () => {
    const ids = await Promise.all(
      [1, 2, 3, 4].map((hours) => photo(`r${hours}`, hours))
    );
    const pageOne = await listGalleryPage({
      after: START,
      limit: 2,
      userId: FIRST,
    });
    const boundary = pageOne.images.at(-1)?.id ?? "";
    await prisma.image.delete({ where: { id: boundary } });
    const pageTwo = await listGalleryPage({
      after: pageOne.next ?? undefined,
      limit: 2,
      userId: FIRST,
    });
    const own = pageTwo.images
      .filter(({ key }) => key.startsWith(PREFIX))
      .map(({ id }) => id);
    expect(own).toEqual(
      [...ids]
        .reverse()
        .filter((id) => id !== boundary)
        .slice(-2)
    );
  });

  it("keeps a stable order by id for Images created at the same moment, never straddling a page twice", async () => {
    const ids = await Promise.all(
      ["t1", "t2", "t3", "t4", "t5"].map((name) => photo(name, 7))
    );
    const { ids: seen } = await everyId(listGalleryPage, FIRST, 2);
    expect(seen).toEqual([...ids].sort().reverse());
  });
});

describe("listFavoritesPage", () => {
  it("tells when the Image was uploaded, not when it was marked", async () => {
    const id = await photo("uploaded", 2);
    await markAt(id, 9);
    const { images } = await listFavoritesPage({ limit: 500, userId: FIRST });
    expect(images.find((image) => image.id === id)?.createdAt).toEqual(
      atHour(2)
    );
  });

  it("lists the caller's copies, most recently marked first, paged the same way", async () => {
    const [a, b, c] = await Promise.all([
      photo("fa", 1),
      photo("fb", 2),
      photo("fc", 3),
    ]);
    await markAt(a, 10);
    await markAt(c, 11);
    await markAt(b, 12);
    const first = await everyId(listFavoritesPage, FIRST, 2);
    expect(first.ids).toEqual([b, c, a]);
    expect(first.flags).toEqual([true, true, true]);
    const second = await everyId(listFavoritesPage, SECOND, 50);
    expect(second.ids).toEqual(first.ids);
  });

  it("is empty for a User with no Profile yet, and never shows another User's copies", async () => {
    const id = await photo("only-others", 1);
    await markAt(id, 5);
    const none = await listFavoritesPage({ limit: 50, userId: NO_PROFILE });
    expect(none.images.filter(({ key }) => key.startsWith(PREFIX))).toEqual([]);
    const gallery = await everyId(listGalleryPage, NO_PROFILE, 50);
    expect(gallery.flags).toEqual([false]);
  });

  it("drops an Image removed from Laura, and stays exact when an Admin marks between two pages", async () => {
    const [a, b, c] = await Promise.all([
      photo("ma", 1),
      photo("mb", 2),
      photo("mc", 3),
    ]);
    await markAt(a, 10);
    await markAt(b, 11);
    const pageOne = await listFavoritesPage({
      after: START,
      limit: 1,
      userId: FIRST,
    });
    await markAt(c, 12);
    const pageTwo = await listFavoritesPage({
      after: pageOne.next ?? undefined,
      limit: 5,
      userId: FIRST,
    });
    const own = (page: GalleryPage) =>
      page.images
        .filter(({ key }) => key.startsWith(PREFIX))
        .map(({ id }) => id);
    expect(own(pageOne)).toEqual([b]);
    expect(own(pageTwo)).toEqual([a]);
    await prisma.image.delete({ where: { id: a } });
    const fresh = await everyId(listFavoritesPage, FIRST, 50);
    expect(fresh.ids).toEqual([c, b]);
  });
});
