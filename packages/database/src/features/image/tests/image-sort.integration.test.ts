// @module-tag integration

import { App, ImageAccess } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { createImages, listImagesPage, type NewImage } from "../image.service";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-sort-test-user";
const KEY_PREFIX = "image-sort-test-";
const { BACK_OFFICE: OFFICE, LAURA } = App;
const ENTERABLE = [LAURA, OFFICE];

const image = (key: string, access?: ImageAccess, bytes = 1000): NewImage => ({
  access,
  alt: { en: `${key} en`, it: `${key} it` },
  apps: [LAURA],
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes,
  height: 600,
  key: `${KEY_PREFIX}${key}.avif`,
  uploadedBy: USER_ID,
  width: 800,
});

type Listing = Parameters<typeof listImagesPage>[0];
/** This file's Images only (their key holds the prefix), as the list asks. */
const listOurs = (extra: Partial<Listing> = {}) =>
  listImagesPage({
    enterable: ENTERABLE,
    page: 1,
    perPage: 100,
    text: KEY_PREFIX,
    ...extra,
  });
const idsOf = async (extra: Partial<Listing> = {}) =>
  (await listOurs(extra)).images.map(({ id }) => id);
/** Images of the given `bytes`, one per value, in that order. */
const withBytes = (...sizes: number[]) =>
  createImages(sizes.map((bytes, at) => image(`sz${at}`, undefined, bytes)));
const createdAt = (id: string | undefined, at: string) =>
  prisma.image.update({
    data: { createdAt: new Date(at) },
    where: { id: id ?? "" },
  });

const cleanUp = () =>
  prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });

beforeEach(async () => {
  await cleanUp();
  await prisma.user.upsert({
    create: { email: "image-sort-test@image-service.test", id: USER_ID },
    update: {},
    where: { id: USER_ID },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("image.service sort", () => {
  it("orders by Size, up or down", async () => {
    const [a, b, c] = await withBytes(100, 300, 200);
    expect(
      await idsOf({ sort: [{ column: "size", direction: "asc" }] })
    ).toEqual([a?.id, c?.id, b?.id]);
    expect(
      await idsOf({ sort: [{ column: "size", direction: "desc" }] })
    ).toEqual([b?.id, c?.id, a?.id]);
  });

  it("orders by Name, the stored file name, up or down", async () => {
    const [b, a, c] = await createImages([
      image("name-b"),
      image("name-a"),
      image("name-c"),
    ]);
    expect(
      await idsOf({ sort: [{ column: "name", direction: "asc" }] })
    ).toEqual([a?.id, b?.id, c?.id]);
    expect(
      await idsOf({ sort: [{ column: "name", direction: "desc" }] })
    ).toEqual([c?.id, b?.id, a?.id]);
  });

  it("orders by Created, newest first when no sort is given", async () => {
    const [a, b, c] = await withBytes(1, 1, 1);
    await createdAt(a?.id, "2026-01-01T00:00:00.000Z");
    await createdAt(b?.id, "2026-03-01T00:00:00.000Z");
    await createdAt(c?.id, "2026-02-01T00:00:00.000Z");
    expect(
      await idsOf({ sort: [{ column: "created", direction: "asc" }] })
    ).toEqual([a?.id, c?.id, b?.id]);
    expect(await idsOf({ sort: [] })).toEqual([b?.id, c?.id, a?.id]);
    expect(await idsOf()).toEqual([b?.id, c?.id, a?.id]);
  });

  it("orders by Access in the enum's order", async () => {
    const [priv, pub] = await createImages([
      image("priv", ImageAccess.PRIVATE),
      image("pub", ImageAccess.PUBLIC),
    ]);
    expect(
      await idsOf({ sort: [{ column: "access", direction: "asc" }] })
    ).toEqual([pub?.id, priv?.id]);
    expect(
      await idsOf({ sort: [{ column: "access", direction: "desc" }] })
    ).toEqual([priv?.id, pub?.id]);
  });

  it("orders by two sorts, the first wins", async () => {
    const [privSmall, pubSmall, pubBig] = await createImages([
      image("priv-small", ImageAccess.PRIVATE, 10),
      image("pub-small", ImageAccess.PUBLIC, 10),
      image("pub-big", ImageAccess.PUBLIC, 99),
    ]);
    expect(
      await idsOf({
        sort: [
          { column: "access", direction: "asc" },
          { column: "size", direction: "desc" },
        ],
      })
    ).toEqual([pubBig?.id, pubSmall?.id, privSmall?.id]);
  });

  it("never repeats or skips a row across pages of 25 and of 5 when the sort ties", async () => {
    const COUNT = 30;
    await createImages(
      Array.from({ length: COUNT }, (_, at) =>
        image(`tie${at}`, undefined, 500)
      )
    );
    const sort = [{ column: "size", direction: "desc" }] as const;
    const whole = await idsOf({ sort });
    expect(whole).toHaveLength(COUNT);
    expect(new Set(whole).size).toBe(COUNT);

    const paged = async (perPage: number) =>
      (
        await Promise.all(
          Array.from({ length: Math.ceil(COUNT / perPage) }, (_, at) =>
            idsOf({ page: at + 1, perPage, sort })
          )
        )
      ).flat();
    expect(await paged(25)).toEqual(whole);
    expect(await paged(5)).toEqual(whole);
  });
});

describe("image.service range", () => {
  it("keeps the rows of a range, both days included, to the millisecond", async () => {
    const [before, first, last, after] = await withBytes(1, 1, 1, 1);
    await createdAt(before?.id, "2026-11-25T23:59:59.999Z");
    await createdAt(first?.id, "2026-11-26T00:00:00.000Z");
    await createdAt(last?.id, "2026-11-28T23:59:59.999Z");
    await createdAt(after?.id, "2026-11-29T00:00:00.000Z");
    expect(
      await idsOf({
        created: { from: "2026-11-26", to: "2026-11-28" },
        sort: [{ column: "created", direction: "asc" }],
      })
    ).toEqual([first?.id, last?.id]);
  });

  it("composes a range with the other filters, and the totals follow it", async () => {
    const [inRange, wrongAccess, outOfRange] = await createImages([
      image("r-in", ImageAccess.PUBLIC, 40),
      image("r-priv", ImageAccess.PRIVATE, 70),
      image("r-out", ImageAccess.PUBLIC, 90),
    ]);
    await createdAt(inRange?.id, "2026-11-27T10:00:00.000Z");
    await createdAt(wrongAccess?.id, "2026-11-27T10:00:00.000Z");
    await createdAt(outOfRange?.id, "2026-12-01T10:00:00.000Z");
    const day = { from: "2026-11-27", to: "2026-11-27" };
    const found = await listOurs({
      accesses: [ImageAccess.PUBLIC],
      apps: [LAURA],
      created: day,
    });
    expect(found.images.map(({ id }) => id)).toEqual([inRange?.id]);
    expect(found.total).toBe(1);
    expect(found.totalBytes).toBe(40);
    // The visibility rule still applies: a private Image no one enters stays out.
    const unseen = await listOurs({ created: day, enterable: [] });
    expect(unseen.images.map(({ id }) => id)).toEqual([inRange?.id]);
  });
});
