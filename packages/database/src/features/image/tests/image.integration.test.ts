// @module-tag integration
import { App, ImageAccess } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { FIXTURE } from "../../seed/fixtures/fixtures";
import {
  createImages,
  deleteImages,
  getImage,
  type ImageChange,
  type ImageCursor,
  type ImageLinksById,
  ImageNotFoundError,
  listImages,
  type NewImage,
  removeImagesFromApp,
  renameImageKey,
  updateImages,
} from "../image.service";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-test-user";
const KEY_PREFIX = "image-test-";
const { BACK_OFFICE: OFFICE, LAURA } = App;
const IN_LAURA: App[] = [LAURA];
/** The check a caller runs inside the write; these tests let everything through. */
const ALLOW = () => undefined;
/** Writes `changes` as given, whatever the locked placements are. */
const update = (...changes: ImageChange[]) =>
  updateImages(
    changes.map(({ id }) => id),
    () => changes
  );

const image = (
  key: string,
  apps: App[] = [LAURA],
  access?: ImageAccess
): NewImage => ({
  access,
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

// The Test database is dropped after the run; only the connection needs closing.
afterAll(async () => {
  await prisma.$disconnect();
});

describe("image.service reads", () => {
  it("creates each Image with its placements, ordered by App", async () => {
    const [both] = await createImages([image("both", [OFFICE, LAURA])]);
    expect(both?.apps).toEqual([LAURA, OFFICE]);
    expect((await getImage(both?.id ?? ""))?.apps).toEqual([LAURA, OFFICE]);
  });

  it("lists the Images visible in an App, or in any, newest first", async () => {
    // One call each, oldest first: Q (Laura, private), P (Laura and the Back
    // Office, public), R (Back Office, private).
    const [q] = await createImages([image("q", [LAURA])]);
    const [p] = await createImages([
      image("p", [LAURA, OFFICE], ImageAccess.PUBLIC),
    ]);
    const [r] = await createImages([image("r", [OFFICE])]);
    const seen = async (app: App | undefined, enterable: App[]) =>
      oursIn(await listImages({ app, enterable, limit: 100 }));

    expect(await seen(LAURA, [])).toEqual([p?.id]);
    expect(await seen(LAURA, IN_LAURA)).toEqual([p?.id, q?.id]);
    // P is public in every App it is in: the Back Office shows it to anyone.
    expect(await seen(OFFICE, [])).toEqual([p?.id]);
    expect(await seen(OFFICE, IN_LAURA)).toEqual([p?.id]);
    expect(await seen(OFFICE, [LAURA, OFFICE])).toEqual([r?.id, p?.id]);
    expect(await seen(undefined, [])).toEqual([p?.id]);
    expect(await seen(undefined, IN_LAURA)).toEqual([p?.id, q?.id]);
    expect(await seen(undefined, [LAURA, OFFICE])).toEqual([
      r?.id,
      p?.id,
      q?.id,
    ]);
  });

  it("shows a private Image in two Apps to a member of either", async () => {
    const [both] = await createImages([image("both-private", [LAURA, OFFICE])]);
    const seen = async (enterable: App[]) =>
      oursIn(await listImages({ enterable, limit: 100 }));
    expect(await seen([LAURA])).toEqual([both?.id]);
    expect(await seen([OFFICE])).toEqual([both?.id]);
    expect(await seen([])).toEqual([]);
  });

  it("makes an upload private unless it says otherwise", async () => {
    const [made] = await createImages([image("default")]);
    expect(made?.access).toBe(ImageAccess.PRIVATE);
  });

  it("loads the Fixtures with their access", async () => {
    const { access } = await prisma.image.findUniqueOrThrow({
      where: { key: FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE.key },
    });
    expect(access).toBe(FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE.access);
  });

  it("pages with the last Image as the cursor", async () => {
    const created = await createImages([image("a"), image("b")]);
    const [last] = await listImages({
      app: LAURA,
      enterable: IN_LAURA,
      limit: 1,
    });
    if (!last) {
      throw new Error("nothing listed");
    }
    const [next] = await listImages({
      app: LAURA,
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
          app: LAURA,
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
    const [one] = await createImages([image("one", [LAURA])]);
    const id = one?.id ?? "";
    await expect(
      update(
        { id, place: [OFFICE], remove: [LAURA] },
        { id: "missing", place: [OFFICE] }
      )
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA]);

    const [switched] = await update({
      id,
      place: [LAURA, OFFICE],
    });
    expect(switched?.apps).toEqual([LAURA, OFFICE]);
    const [moved] = await update({ id, remove: [LAURA] });
    expect(moved?.apps).toEqual([OFFICE]);
  });

  it("changes an Image's access in every App at once", async () => {
    const [one] = await createImages([image("opened", [LAURA, OFFICE])]);
    const [changed] = await update({
      access: ImageAccess.PUBLIC,
      id: one?.id ?? "",
    });
    expect(changed?.access).toBe(ImageAccess.PUBLIC);
    expect((await getImage(one?.id ?? ""))?.access).toBe(ImageAccess.PUBLIC);
  });

  it("points an Image at a new file name", async () => {
    const [one] = await createImages([image("renamed")]);
    const key = `${KEY_PREFIX}renamed-new.avif`;
    await renameImageKey(one?.id ?? "", key);
    expect((await getImage(one?.id ?? ""))?.key).toBe(key);
  });

  it("keeps a placement added since the caller read the Image", async () => {
    const [one] = await createImages([image("raced", [LAURA])]);
    const id = one?.id ?? "";
    // Another Admin places it in the Back Office after this caller's read.
    await prisma.imageApp.create({ data: { app: OFFICE, imageId: id } });
    const [changed] = await update({ id, place: [LAURA] });
    expect(changed?.apps).toEqual([LAURA, OFFICE]);
  });

  it("keeps the placements when a change leaves apps out", async () => {
    const [one] = await createImages([image("kept", [LAURA])]);
    const alt = { en: "new en", it: "new it" };
    const [changed] = await update({ alt, id: one?.id ?? "" });
    expect(changed?.apps).toEqual([LAURA]);
    expect(changed?.alt).toEqual(alt);
  });

  it("works the changes out against the placements it locked", async () => {
    const [one] = await createImages([image("resolved", [OFFICE, LAURA])]);
    const id = one?.id ?? "";
    // Another Admin takes it out of Laura before this write locks it.
    await removeImagesFromApp([id], LAURA, ALLOW);
    const seen = vi.fn((): ImageChange[] => [{ id, place: [LAURA] }]);
    const [changed] = await updateImages([id, id], seen);
    expect(seen).toHaveBeenCalledWith(
      new Map([[id, { access: ImageAccess.PRIVATE, apps: [OFFICE] }]])
    );
    expect(changed?.apps).toEqual([LAURA, OFFICE]);
  });
});

describe("image.service writes, worked out in the transaction", () => {
  it("names every id it does not know before asking for the changes", async () => {
    const [one] = await createImages([image("unknown")]);
    const resolve = vi.fn((): ImageChange[] => []);
    await expect(
      updateImages([one?.id ?? "", "missing"], resolve)
    ).rejects.toMatchObject({ ids: ["missing"] });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("writes nothing when working out the changes refuses", async () => {
    const [one] = await createImages([image("refused", [LAURA])]);
    const id = one?.id ?? "";
    await expect(
      updateImages([id], () => {
        throw new Error("refused");
      })
    ).rejects.toThrow("refused");
    expect((await getImage(id))?.apps).toEqual([LAURA]);
  });

  it("applies a batch naming one Image twice in order", async () => {
    const [one] = await createImages([image("twice")]);
    const id = one?.id ?? "";
    const alt = { en: "new en", it: "new it" };
    await expect(
      update(
        { id, place: [LAURA] },
        { alt, id, place: [OFFICE], remove: [LAURA] }
      )
    ).resolves.toHaveLength(2);
    expect((await getImage(id))?.apps).toEqual([OFFICE]);
    expect(await deleteImages([id, id], ALLOW)).toEqual([one?.key]);
  });

  it("takes Images out of an App, deleting only those left in none", async () => {
    const [shared, alone] = await createImages([
      image("shared", [LAURA, OFFICE]),
      image("alone", [LAURA]),
    ]);
    const sharedId = shared?.id ?? "";
    const aloneId = alone?.id ?? "";
    expect(
      await removeImagesFromApp([sharedId, aloneId], LAURA, ALLOW)
    ).toEqual([alone?.key]);
    expect((await getImage(sharedId))?.apps).toEqual([OFFICE]);
    expect(await getImage(aloneId)).toBeNull();
  });

  it("takes nothing out when one id is unknown", async () => {
    const [one] = await createImages([image("stays", [LAURA, OFFICE])]);
    const id = one?.id ?? "";
    await expect(
      removeImagesFromApp([id, "missing"], LAURA, ALLOW)
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA, OFFICE]);
  });

  it("deletes every id or none, placements included, returning the keys", async () => {
    const [one] = await createImages([image("gone", [LAURA, OFFICE])]);
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
    const [one] = await createImages([image("emptied", [LAURA, OFFICE])]);
    const id = one?.id ?? "";
    // Another Admin takes it out of Laura after this caller read both placements.
    await removeImagesFromApp([id], LAURA, ALLOW);
    await expect(update({ id, remove: [OFFICE] })).rejects.toMatchObject({
      ids: [id],
    });
    expect((await getImage(id))?.apps).toEqual([OFFICE]);
  });

  it("never leaves an Image in no App when two Admins take it out at once", async () => {
    const RUNS = 10;
    const left = await Promise.all(
      Array.from({ length: RUNS }, async (_, run) => {
        const [one] = await createImages([
          image(`at-once-${run}`, [LAURA, OFFICE]),
        ]);
        const id = one?.id ?? "";
        await Promise.allSettled([
          removeImagesFromApp([id], LAURA, ALLOW),
          update({ id, remove: [OFFICE] }),
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
    const [one] = await createImages([image("checked", [LAURA])]);
    const id = one?.id ?? "";
    // Placed in the Back Office after the caller's own read: the check sees it.
    await prisma.imageApp.create({ data: { app: OFFICE, imageId: id } });
    const seen: ImageLinksById[] = [];
    const refuse = (links: ImageLinksById) => {
      seen.push(links);
      throw new Error("refused");
    };
    await expect(deleteImages([id], refuse)).rejects.toThrow("refused");
    await expect(removeImagesFromApp([id], LAURA, refuse)).rejects.toThrow(
      "refused"
    );
    const placed = new Map([
      [id, { access: ImageAccess.PRIVATE, apps: [LAURA, OFFICE] }],
    ]);
    expect(seen).toEqual([placed, placed]);
    expect((await getImage(id))?.apps).toEqual([LAURA, OFFICE]);
  });
});
