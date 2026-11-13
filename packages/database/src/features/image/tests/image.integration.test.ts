// @module-tag integration

import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { FIXTURE } from "../../seed/fixtures/fixtures";
import {
  createImages,
  deleteImages,
  getImage,
  type ImageChange,
  ImageNotFoundError,
  type ImagePlacementsById,
  listImagesPage,
  type NewImage,
  removeImagesFromApp,
  updateImages,
} from "../image.service";
import { imageStats } from "../image-stats";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-test-user";
const KEY_PREFIX = "image-test-";
const { BACK_OFFICE: OFFICE, LAURA } = App;
const IN_LAURA: App[] = [LAURA];
/** The check a caller runs inside the write; these tests let everything through. */
/** A delete check that lets every Image it is shown through. */
const LET_THROUGH = (placements: ImagePlacementsById) => [...placements.keys()];
/** Each Image named, with the Version a form opened now would carry. */
const openedNow = (ids: readonly string[]) =>
  Promise.all(
    ids.map(async (id) => ({
      id,
      version: (await getImage(id))?.version ?? "",
    }))
  );
/** Writes `changes` as given, on the Images as they are now, whatever the locked placements are. */
const update = async (...changes: ImageChange[]) =>
  updateImages(await openedNow(changes.map(({ id }) => id)), () => changes);

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

/** Every Image `enterable` sees (in `app`, or in any), newest first. */
const visibleTo = async (enterable: App[], app?: App) =>
  (await listImagesPage({ app, enterable, page: 1, perPage: 100 })).images;

const cleanUp = () =>
  prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });

beforeEach(async () => {
  await cleanUp();
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    // Its own domain: the Fixtures' is theirs alone.
    data: { email: "image-test@image-service.test", id: USER_ID },
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
      oursIn(await visibleTo(enterable, app));

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
    const seen = async (enterable: App[]) => oursIn(await visibleTo(enterable));
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

  it("fills a Language missing from a stored alt with another's text", async () => {
    const [one] = await createImages([image("old")]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", fr: "La mer" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({
      en: "The sea",
      fr: "La mer",
      it: "The sea",
    });
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

describe("image.service numbered list", () => {
  const pageOf = async (page: number, perPage: number, enterable: App[]) =>
    listImagesPage({ app: undefined, enterable, page, perPage });

  it("lists the second page with the real total", async () => {
    const made = [
      ...(await createImages([image("n1", [LAURA])])),
      ...(await createImages([image("n2", [LAURA])])),
      ...(await createImages([image("n3", [LAURA])])),
    ];
    const everyone = await pageOf(1, 100, IN_LAURA);
    const ours = oursIn(everyone.images);
    expect(ours).toEqual(made.map(({ id }) => id).reverse());
    const second = await pageOf(2, 1, IN_LAURA);
    expect(second.images).toHaveLength(1);
    expect(second.total).toBe(everyone.total);
  });

  it("sums bytes over every visible Image, not just the page", async () => {
    await createImages([image("b1", [LAURA]), image("b2", [LAURA])]);
    const all = await pageOf(1, 100, IN_LAURA);
    const onePage = await pageOf(1, 1, IN_LAURA);
    expect(onePage.totalBytes).toBe(all.totalBytes);
    expect(all.totalBytes).toBeGreaterThanOrEqual(2000);
  });

  it("counts only Images the caller may see", async () => {
    const laura = await pageOf(1, 100, IN_LAURA);
    const both = await pageOf(1, 100, [LAURA, OFFICE]);
    await createImages([image("v1", [OFFICE])]);
    const lauraAfter = await pageOf(1, 100, IN_LAURA);
    const bothAfter = await pageOf(1, 100, [LAURA, OFFICE]);
    expect(lauraAfter.total).toBe(laura.total);
    expect(lauraAfter.totalBytes).toBe(laura.totalBytes);
    expect(bothAfter.total).toBe(both.total + 1);
    expect(bothAfter.totalBytes).toBe(both.totalBytes + 1000);
  });

  it("answers no images and real totals past the last page", async () => {
    await createImages([image("p1", [LAURA])]);
    const { total, totalBytes } = await pageOf(1, 100, IN_LAURA);
    const past = await pageOf(1000, 100, IN_LAURA);
    expect(past.images).toEqual([]);
    expect(past.total).toBe(total);
    expect(past.totalBytes).toBe(totalBytes);
  });

  it("finds Images by their alt text in either language, ignoring case", async () => {
    await createImages([
      { ...image("sea", [LAURA]), alt: { en: "The Sea", it: "Il mare" } },
      { ...image("hills", [LAURA]), alt: { en: "Green hills", it: "Colline" } },
    ]);
    const find = async (text: string) =>
      (
        await listImagesPage({
          enterable: IN_LAURA,
          page: 1,
          perPage: 100,
          text,
        })
      ).images.map(({ alt }) => alt.en);
    expect(await find("sea")).toEqual(["The Sea"]);
    expect(await find("MARE")).toEqual(["The Sea"]);
    expect(await find("colline")).toEqual(["Green hills"]);
    expect(await find("no-such-picture")).toEqual([]);
  });

  it("keeps only the public, or only the private, Images when asked", async () => {
    await createImages([
      image("pub", [LAURA], ImageAccess.PUBLIC),
      image("priv", [LAURA], ImageAccess.PRIVATE),
    ]);
    const accessOf = async (access: ImageAccess) =>
      (
        await listImagesPage({
          accesses: [access],
          enterable: IN_LAURA,
          page: 1,
          perPage: 100,
        })
      ).images.map((one) => one.access);
    expect(new Set(await accessOf(ImageAccess.PUBLIC))).toEqual(
      new Set([ImageAccess.PUBLIC])
    );
    expect(new Set(await accessOf(ImageAccess.PRIVATE))).toEqual(
      new Set([ImageAccess.PRIVATE])
    );
  });

  it("counts and sums only what the search finds", async () => {
    await createImages([
      { ...image("one", [LAURA]), alt: { en: "findable one", it: "x" } },
      { ...image("two", [LAURA]), alt: { en: "findable two", it: "y" } },
    ]);
    const found = await listImagesPage({
      enterable: IN_LAURA,
      page: 1,
      perPage: 1,
      text: "findable",
    });
    expect(found.total).toBe(2);
    expect(found.totalBytes).toBe(2000);
    expect(found.images).toHaveLength(1);
  });

  it("sums the bytes of the Images it counts", async () => {
    await createImages([image("s1", [LAURA])]);
    const page = await pageOf(1, 100, IN_LAURA);
    expect(page.images.length).toBe(page.total);
    expect(page.totalBytes).toBe(
      page.images.reduce((n, { bytes }) => n + bytes, 0)
    );
  });
});

describe("image.service list filters", () => {
  it("keeps Images with any of several accesses, so both together keep every one", async () => {
    await createImages([
      image("both-pub", [LAURA], ImageAccess.PUBLIC),
      image("both-priv", [LAURA], ImageAccess.PRIVATE),
    ]);
    const found = await listImagesPage({
      accesses: [ImageAccess.PUBLIC, ImageAccess.PRIVATE],
      enterable: IN_LAURA,
      page: 1,
      perPage: 100,
    });
    expect(oursIn(found.images)).toHaveLength(2);
  });

  it("keeps the Images placed in any of the Apps asked for", async () => {
    await createImages([
      image("in-laura", [LAURA]),
      image("in-office", [OFFICE]),
    ]);
    const idsIn = async (apps: App[]) =>
      oursIn(
        (
          await listImagesPage({
            apps,
            enterable: [LAURA, OFFICE],
            page: 1,
            perPage: 100,
          })
        ).images
      ).length;
    expect(await idsIn([LAURA])).toBe(1);
    expect(await idsIn([OFFICE])).toBe(1);
    expect(await idsIn([LAURA, OFFICE])).toBe(2);
  });

  it("finds Images by their file name too", async () => {
    await createImages([
      {
        ...image("needle-file", [LAURA]),
        alt: { en: "plain", it: "semplice" },
      },
    ]);
    const found = await listImagesPage({
      enterable: IN_LAURA,
      page: 1,
      perPage: 100,
      text: "NEEDLE-file",
    });
    expect(found.images.map(({ key }) => key)).toEqual([
      `${KEY_PREFIX}needle-file.avif`,
    ]);
  });
});

/** An App's stats, or zeros for an App with no Image. */
const statOf = (stats: Awaited<ReturnType<typeof imageStats>>, app: App) =>
  stats.byApp.find((row) => row.app === app) ?? {
    app,
    privateBytes: 0,
    privateCount: 0,
    publicBytes: 0,
    publicCount: 0,
  };

describe("image.service stats", () => {
  // The Fixtures live in the same database: each test reads the stats before
  // and after, and checks what its own Images added.
  it("counts an Image placed in two Apps once in the totals and in each App", async () => {
    const before = await imageStats();
    await createImages([{ ...image("st1", [LAURA, OFFICE]), bytes: 300 }]);
    const after = await imageStats();
    expect(after.total - before.total).toBe(1);
    expect(after.totalBytes - before.totalBytes).toBe(300);
    for (const app of [LAURA, OFFICE]) {
      expect(
        statOf(after, app).privateBytes - statOf(before, app).privateBytes
      ).toBe(300);
      expect(
        statOf(after, app).privateCount - statOf(before, app).privateCount
      ).toBe(1);
    }
  });

  it("splits an App's bytes by access", async () => {
    const before = await imageStats();
    await createImages([
      { ...image("st2", [LAURA], ImageAccess.PUBLIC), bytes: 50 },
      { ...image("st3", [LAURA]), bytes: 7 },
    ]);
    const after = await imageStats();
    const [was, now] = [statOf(before, LAURA), statOf(after, LAURA)];
    expect(now.publicBytes - was.publicBytes).toBe(50);
    expect(now.publicCount - was.publicCount).toBe(1);
    expect(now.privateBytes - was.privateBytes).toBe(7);
    expect(now.privateCount - was.privateCount).toBe(1);
  });

  it("lists only Apps that have an Image, in the enum's order", async () => {
    await createImages([image("st4", [OFFICE]), image("st5", [LAURA])]);
    const listed = (await imageStats()).byApp.map(({ app }) => app);
    expect(listed).toEqual(
      objectValues(App).filter((app) => listed.includes(app))
    );
    expect(listed).toEqual([LAURA, OFFICE]);
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
    await removeImagesFromApp([id], LAURA, LET_THROUGH);
    const seen = vi.fn((): ImageChange[] => [{ id, place: [LAURA] }]);
    const [changed] = await updateImages(await openedNow([id, id]), seen);
    expect(seen).toHaveBeenCalledWith(
      new Map([
        [id, { access: ImageAccess.PRIVATE, apps: [OFFICE], key: one?.key }],
      ])
    );
    expect(changed?.apps).toEqual([LAURA, OFFICE]);
  });
});

describe("image.service writes, worked out in the transaction", () => {
  it("names every id it does not know before asking for the changes", async () => {
    const [one] = await createImages([image("unknown")]);
    const resolve = vi.fn((): ImageChange[] => []);
    await expect(
      updateImages(await openedNow([one?.id ?? "", "missing"]), resolve)
    ).rejects.toMatchObject({ ids: ["missing"] });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("writes nothing when working out the changes refuses", async () => {
    const [one] = await createImages([image("refused", [LAURA])]);
    const id = one?.id ?? "";
    await expect(
      updateImages(await openedNow([id]), () => {
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
    expect(await deleteImages([id, id], LET_THROUGH)).toEqual({
      deleted: 1,
      keys: [one?.key],
    });
  });

  it("takes Images out of an App, deleting only those left in none", async () => {
    const [shared, alone] = await createImages([
      image("shared", [LAURA, OFFICE]),
      image("alone", [LAURA]),
    ]);
    const sharedId = shared?.id ?? "";
    const aloneId = alone?.id ?? "";
    expect(
      await removeImagesFromApp([sharedId, aloneId], LAURA, LET_THROUGH)
    ).toEqual({ deleted: 2, keys: [alone?.key] });
    expect((await getImage(sharedId))?.apps).toEqual([OFFICE]);
    expect(await getImage(aloneId)).toBeNull();
  });

  it("skips an unknown id and takes the others out", async () => {
    const [one] = await createImages([image("leaves", [LAURA, OFFICE])]);
    const id = one?.id ?? "";
    expect(
      await removeImagesFromApp([id, "missing"], LAURA, LET_THROUGH)
    ).toEqual({
      deleted: 1,
      keys: [],
    });
    expect((await getImage(id))?.apps).toEqual([OFFICE]);
  });

  it("deletes the Images that exist, skipping an unknown id, placements included", async () => {
    const [one] = await createImages([image("gone", [LAURA, OFFICE])]);
    const id = one?.id ?? "";
    expect(await deleteImages([id, "missing"], LET_THROUGH)).toEqual({
      deleted: 1,
      keys: [one?.key],
    });
    expect(await getImage(id)).toBeNull();
    expect(await prisma.imageApp.count({ where: { imageId: id } })).toBe(0);
  });

  it("deletes only the Images its check lets through, and counts those", async () => {
    const [kept, dropped] = await createImages([
      image("kept", [LAURA]),
      image("dropped", [LAURA]),
    ]);
    const keptId = kept?.id ?? "";
    const droppedId = dropped?.id ?? "";
    expect(await deleteImages([keptId, droppedId], () => [droppedId])).toEqual({
      deleted: 1,
      keys: [dropped?.key],
    });
    expect(await getImage(keptId)).not.toBeNull();
    expect(await getImage(droppedId)).toBeNull();
  });

  it("deletes nothing, and says 0, when every id is unknown", async () => {
    expect(await deleteImages(["missing"], LET_THROUGH)).toEqual({
      deleted: 0,
      keys: [],
    });
  });

  it("keeps an Image when its uploader is deleted", async () => {
    const [one] = await createImages([image("orphan")]);
    await prisma.user.delete({ where: { id: USER_ID } });
    expect((await getImage(one?.id ?? ""))?.uploadedBy).toBeNull();
  });
});

describe("image.service never leaves an Image in no App", () => {
  it("a batch that leaves an Image in no App throws ResourceChangedError with its id", async () => {
    const [one] = await createImages([image("emptied", [LAURA, OFFICE])]);
    const id = one?.id ?? "";
    // Another Admin takes it out of Laura after this caller read both placements.
    await removeImagesFromApp([id], LAURA, LET_THROUGH);
    const refused = update({ id, remove: [OFFICE] });
    await expect(refused).rejects.toBeInstanceOf(ResourceChangedError);
    await expect(refused).rejects.toMatchObject({ ids: [id] });
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
          removeImagesFromApp([id], LAURA, LET_THROUGH),
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

describe("image.service writes on a Version", () => {
  it("an Image change on an older Version throws ResourceChangedError and writes nothing", async () => {
    const [one] = await createImages([image("stale", [LAURA])]);
    const id = one?.id ?? "";
    const opened = await openedNow([id]);
    // Another Admin changes its alt after this caller opened it.
    await update({ alt: { en: "theirs", it: "loro" }, id });
    await expect(
      updateImages(opened, () => [{ access: ImageAccess.PUBLIC, id }])
    ).rejects.toBeInstanceOf(ResourceChangedError);
    expect(await getImage(id)).toMatchObject({
      access: ImageAccess.PRIVATE,
      alt: { en: "theirs", it: "loro" },
    });
  });

  it("an App-only change moves the Image's Version", async () => {
    const [one] = await createImages([image("moved", [LAURA])]);
    const id = one?.id ?? "";
    // Placed and taken out again: the Apps end as they were, the Version not.
    const [, changed] = await update(
      { id, place: [OFFICE] },
      { id, remove: [OFFICE] }
    );
    expect(changed?.apps).toEqual([LAURA]);
    expect(changed?.updatedAt).not.toEqual(one?.updatedAt);
    expect(changed?.version).not.toBe(one?.version);
  });

  it("two changes made on one Version at once: the second throws", async () => {
    const [one] = await createImages([image("together", [LAURA])]);
    const id = one?.id ?? "";
    const opened = await openedNow([id]);
    const settled = await Promise.allSettled(
      ["first", "second"].map((tag) =>
        updateImages(opened, () => [
          { alt: { en: `${tag} en`, it: `${tag} it` }, id },
        ])
      )
    );
    const refused = settled.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : []
    );
    expect(refused).toHaveLength(1);
    expect(refused[0]).toBeInstanceOf(ResourceChangedError);
  });
});

describe("image.service deletes", () => {
  it("checks the placements it locked, and writes nothing when the check refuses", async () => {
    const [one] = await createImages([image("checked", [LAURA])]);
    const id = one?.id ?? "";
    // Placed in the Back Office after the caller's own read: the check sees it.
    await prisma.imageApp.create({ data: { app: OFFICE, imageId: id } });
    const seen: ImagePlacementsById[] = [];
    const refuse = (placements: ImagePlacementsById) => {
      seen.push(placements);
      throw new Error("refused");
    };
    await expect(deleteImages([id], refuse)).rejects.toThrow("refused");
    await expect(removeImagesFromApp([id], LAURA, refuse)).rejects.toThrow(
      "refused"
    );
    const placed = new Map([
      [
        id,
        { access: ImageAccess.PRIVATE, apps: [LAURA, OFFICE], key: one?.key },
      ],
    ]);
    expect(seen).toEqual([placed, placed]);
    expect((await getImage(id))?.apps).toEqual([LAURA, OFFICE]);
  });
});
