// @module-tag integration
import { App } from "../../../../generated/prisma/enums";
import type { ImageLink } from "../../auth/access/access";
import { prisma } from "../../prisma/client";
import {
  createImages,
  deleteImages,
  getImage,
  type ImageCursor,
  ImageNotFoundError,
  linksOfImages,
  listImages,
  type NewImage,
  removeImagesFromApp,
  updateImages,
} from "../image.service";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-test-user";
const KEY_PREFIX = "image-test-";
const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const IN_LAURA: App[] = [App.LAURA];
/** The check a caller runs inside the write; these tests let everything through. */
const ALLOW = () => undefined;

const image = (key: string, apps: ImageLink[] = [LAURA_PRIVATE]): NewImage => ({
  alt: { en: `${key} en`, it: `${key} it` },
  apps,
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  height: 600,
  key: `${KEY_PREFIX}${key}.avif`,
  uploadedBy: USER_ID,
  width: 800,
});

/** This file's Images among what a listing returned, in its order. */
const oursIn = (listed: readonly { id: string; key: string }[]) =>
  listed.filter(({ key }) => key.startsWith(KEY_PREFIX)).map(({ id }) => id);

const cleanUp = () =>
  prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });

beforeEach(async () => {
  await cleanUp();
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { email: "image-test@allonfire.test", id: USER_ID },
  });
});

afterAll(async () => {
  await cleanUp();
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("image.service reads", () => {
  it("creates each Image with its placements, ordered by App", async () => {
    const [both] = await createImages([
      image("both", [OFFICE_PRIVATE, LAURA_PUBLIC]),
    ]);
    expect(both?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
    expect((await getImage(both?.id ?? ""))?.apps).toEqual([
      LAURA_PUBLIC,
      OFFICE_PRIVATE,
    ]);
  });

  it("lists the Images visible in an App, or in any, newest first", async () => {
    // One call each, oldest first: Q (Laura, private), P (Laura public and
    // Back office private), R (Back office, private).
    const [q] = await createImages([image("q", [LAURA_PRIVATE])]);
    const [p] = await createImages([
      image("p", [LAURA_PUBLIC, OFFICE_PRIVATE]),
    ]);
    const [r] = await createImages([image("r", [OFFICE_PRIVATE])]);
    const seen = async (app: App | undefined, enterable: App[]) =>
      oursIn(await listImages({ app, enterable, limit: 100 }));

    expect(await seen(App.LAURA, [])).toEqual([p?.id]);
    expect(await seen(App.LAURA, IN_LAURA)).toEqual([p?.id, q?.id]);
    // P is public in Laura, not in the Back office: the filter and the
    // public test hold on the same placement.
    expect(await seen(App.BACK_OFFICE, [])).toEqual([]);
    expect(await seen(App.BACK_OFFICE, IN_LAURA)).toEqual([]);
    expect(await seen(App.BACK_OFFICE, [App.LAURA, App.BACK_OFFICE])).toEqual([
      r?.id,
      p?.id,
    ]);
    expect(await seen(undefined, [])).toEqual([p?.id]);
    expect(await seen(undefined, IN_LAURA)).toEqual([p?.id, q?.id]);
    expect(await seen(undefined, [App.LAURA, App.BACK_OFFICE])).toEqual([
      r?.id,
      p?.id,
      q?.id,
    ]);
  });

  it("pages with the last Image as the cursor", async () => {
    const created = await createImages([image("a"), image("b")]);
    const [last] = await listImages({
      app: App.LAURA,
      enterable: IN_LAURA,
      limit: 1,
    });
    if (!last) {
      throw new Error("nothing listed");
    }
    const [next] = await listImages({
      app: App.LAURA,
      cursor: { createdAt: last.createdAt, id: last.id },
      enterable: IN_LAURA,
      limit: 1,
    });
    expect(next?.id).not.toBe(last.id);
    expect(created.map(({ id }) => id)).toContain(next?.id);
  });

  it("keeps paging after the cursor's Image is deleted", async () => {
    // One batch: the rows may share createdAt, so the id breaks the tie.
    await createImages([image("p1"), image("p2"), image("p3")]);
    const ours = async (cursor?: ImageCursor) =>
      (
        await listImages({
          app: App.LAURA,
          cursor,
          enterable: IN_LAURA,
          limit: 100,
        })
      ).filter(({ key }) => key.startsWith(KEY_PREFIX));
    const [first, ...rest] = await ours();
    if (!first) {
      throw new Error("nothing listed");
    }
    await deleteImages([first.id], ALLOW);
    const after = await ours({ createdAt: first.createdAt, id: first.id });
    expect(after.map(({ id }) => id)).toEqual(rest.map(({ id }) => id));
  });

  it("fills a Language missing from a stored alt with another's text", async () => {
    const [one] = await createImages([image("old")]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", fr: "La mer" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "The sea" });
  });

  it("keeps a stored empty alt empty, since it marks a decorative Image", async () => {
    const [one] = await createImages([image("deco")]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", it: "" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "" });
  });
});

describe("image.service writes", () => {
  it("places and takes out only the Apps a change names, all or nothing", async () => {
    const [one] = await createImages([image("one", [LAURA_PRIVATE])]);
    const id = one?.id ?? "";
    await expect(
      updateImages([
        { id, place: [OFFICE_PRIVATE], remove: [App.LAURA] },
        { id: "missing", place: [OFFICE_PRIVATE] },
      ])
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA_PRIVATE]);

    const [switched] = await updateImages([
      { id, place: [LAURA_PUBLIC, OFFICE_PRIVATE] },
    ]);
    expect(switched?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
    const [moved] = await updateImages([{ id, remove: [App.LAURA] }]);
    expect(moved?.apps).toEqual([OFFICE_PRIVATE]);
  });

  it("keeps a placement added since the caller read the Image", async () => {
    const [one] = await createImages([image("raced", [LAURA_PRIVATE])]);
    const id = one?.id ?? "";
    // Another Admin places it in the Back office after this caller's read.
    await prisma.imageApp.create({ data: { ...OFFICE_PRIVATE, imageId: id } });
    const [changed] = await updateImages([{ id, place: [LAURA_PUBLIC] }]);
    expect(changed?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
  });

  it("keeps the placements when a change leaves apps out", async () => {
    const [one] = await createImages([image("kept", [LAURA_PUBLIC])]);
    const alt = { en: "new en", it: "new it" };
    const [changed] = await updateImages([{ alt, id: one?.id ?? "" }]);
    expect(changed?.apps).toEqual([LAURA_PUBLIC]);
    expect(changed?.alt).toEqual(alt);
  });

  it("names each Image's placements, or every id it does not know", async () => {
    const [one] = await createImages([
      image("links-of", [OFFICE_PRIVATE, LAURA_PUBLIC]),
    ]);
    const id = one?.id ?? "";
    expect(await linksOfImages([id, id])).toEqual(
      new Map([[id, [LAURA_PUBLIC, OFFICE_PRIVATE]]])
    );
    await expect(linksOfImages([id, "missing"])).rejects.toMatchObject({
      ids: ["missing"],
    });
  });

  it("applies a batch naming one Image twice in order", async () => {
    const [one] = await createImages([image("twice")]);
    const id = one?.id ?? "";
    const alt = { en: "new en", it: "new it" };
    await expect(
      updateImages([
        { id, place: [LAURA_PUBLIC] },
        { alt, id, place: [OFFICE_PRIVATE], remove: [App.LAURA] },
      ])
    ).resolves.toHaveLength(2);
    expect((await getImage(id))?.apps).toEqual([OFFICE_PRIVATE]);
    expect(await deleteImages([id, id], ALLOW)).toEqual([one?.key]);
  });

  it("takes Images out of an App, deleting only those left in none", async () => {
    const [shared, alone] = await createImages([
      image("shared", [LAURA_PUBLIC, OFFICE_PRIVATE]),
      image("alone", [LAURA_PRIVATE]),
    ]);
    const sharedId = shared?.id ?? "";
    const aloneId = alone?.id ?? "";
    expect(
      await removeImagesFromApp([sharedId, aloneId], App.LAURA, ALLOW)
    ).toEqual([alone?.key]);
    expect((await getImage(sharedId))?.apps).toEqual([OFFICE_PRIVATE]);
    expect(await getImage(aloneId)).toBeNull();
  });

  it("takes nothing out when one id is unknown", async () => {
    const [one] = await createImages([
      image("stays", [LAURA_PUBLIC, OFFICE_PRIVATE]),
    ]);
    const id = one?.id ?? "";
    await expect(
      removeImagesFromApp([id, "missing"], App.LAURA, ALLOW)
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
  });

  it("deletes every id or none, placements included, returning the keys", async () => {
    const [one] = await createImages([
      image("gone", [LAURA_PUBLIC, OFFICE_PRIVATE]),
    ]);
    const id = one?.id ?? "";
    await expect(deleteImages([id, "missing"], ALLOW)).rejects.toBeInstanceOf(
      ImageNotFoundError
    );
    expect(await getImage(id)).not.toBeNull();
    expect(await deleteImages([id], ALLOW)).toEqual([one?.key]);
    expect(await getImage(id)).toBeNull();
    expect(await prisma.imageApp.count({ where: { imageId: id } })).toBe(0);
  });

  it("keeps an Image when its uploader is deleted", async () => {
    const [one] = await createImages([image("orphan")]);
    await prisma.user.delete({ where: { id: USER_ID } });
    expect((await getImage(one?.id ?? ""))?.uploadedBy).toBeNull();
  });
});

describe("image.service never leaves an Image in no App", () => {
  it("refuses a change that would leave an Image in no App, writing nothing", async () => {
    const [one] = await createImages([
      image("emptied", [LAURA_PRIVATE, OFFICE_PRIVATE]),
    ]);
    const id = one?.id ?? "";
    // Another Admin takes it out of Laura after this caller read both placements.
    await removeImagesFromApp([id], App.LAURA, ALLOW);
    await expect(
      updateImages([{ id, remove: [App.BACK_OFFICE] }])
    ).rejects.toMatchObject({ ids: [id] });
    expect((await getImage(id))?.apps).toEqual([OFFICE_PRIVATE]);
  });

  it("never leaves an Image in no App when two Admins take it out at once", async () => {
    const RUNS = 10;
    const left = await Promise.all(
      Array.from({ length: RUNS }, async (_, run) => {
        const [one] = await createImages([
          image(`at-once-${run}`, [LAURA_PRIVATE, OFFICE_PRIVATE]),
        ]);
        const id = one?.id ?? "";
        await Promise.allSettled([
          removeImagesFromApp([id], App.LAURA, ALLOW),
          updateImages([{ id, remove: [App.BACK_OFFICE] }]),
        ]);
        return getImage(id);
      })
    );
    for (const kept of left) {
      expect(kept === null || kept.apps.length > 0).toBe(true);
    }
  });
});

describe("image.service deletes", () => {
  it("checks the placements it locked, and writes nothing when the check refuses", async () => {
    const [one] = await createImages([image("checked", [LAURA_PRIVATE])]);
    const id = one?.id ?? "";
    // Placed in the Back office after the caller's own read: the check sees it.
    await prisma.imageApp.create({ data: { ...OFFICE_PRIVATE, imageId: id } });
    const seen: ReadonlyMap<string, readonly ImageLink[]>[] = [];
    const refuse = (links: ReadonlyMap<string, readonly ImageLink[]>) => {
      seen.push(links);
      throw new Error("refused");
    };
    await expect(deleteImages([id], refuse)).rejects.toThrow("refused");
    await expect(removeImagesFromApp([id], App.LAURA, refuse)).rejects.toThrow(
      "refused"
    );
    const placed = new Map([[id, [LAURA_PRIVATE, OFFICE_PRIVATE]]]);
    expect(seen).toEqual([placed, placed]);
    expect((await getImage(id))?.apps).toEqual([LAURA_PRIVATE, OFFICE_PRIVATE]);
  });
});
