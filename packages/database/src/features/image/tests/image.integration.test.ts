// @module-tag integration
import { AllowedApp } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import {
  createImages,
  deleteImages,
  getImage,
  type ImageCursor,
  ImageNotFoundError,
  listImages,
  type NewImage,
  updateImages,
} from "../image.service";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-test-user";
const KEY_PREFIX = "image-test-";

const image = (key: string, app: AllowedApp): NewImage => ({
  alt: { en: `${key} en`, it: `${key} it` },
  app,
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  height: 600,
  key: `${KEY_PREFIX}${key}.webp`,
  uploadedBy: USER_ID,
  width: 800,
});

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

describe("image.service", () => {
  it("lists an App's Images and the ALL ones, newest first", async () => {
    const [laura] = await createImages([image("laura", AllowedApp.LAURA)]);
    const [shared] = await createImages([image("shared", AllowedApp.ALL)]);
    const listed = await listImages({ app: AllowedApp.LAURA, limit: 10 });
    const ours = listed.filter(({ key }) => key.startsWith(KEY_PREFIX));
    expect(ours.map(({ id }) => id)).toEqual([shared?.id, laura?.id]);
    expect(ours[0]?.alt).toEqual({ en: "shared en", it: "shared it" });
  });

  it("pages with the last Image as the cursor", async () => {
    const created = await createImages([
      image("a", AllowedApp.LAURA),
      image("b", AllowedApp.LAURA),
    ]);
    const [last] = await listImages({ app: AllowedApp.LAURA, limit: 1 });
    if (!last) {
      throw new Error("nothing listed");
    }
    const [next] = await listImages({
      app: AllowedApp.LAURA,
      cursor: { createdAt: last.createdAt, id: last.id },
      limit: 1,
    });
    expect(next?.id).not.toBe(last.id);
    expect(created.map(({ id }) => id)).toContain(next?.id);
  });

  it("keeps paging after the cursor's Image is deleted", async () => {
    // One batch: the rows may share createdAt, so the id breaks the tie.
    await createImages([
      image("p1", AllowedApp.LAURA),
      image("p2", AllowedApp.LAURA),
      image("p3", AllowedApp.LAURA),
    ]);
    const ours = async (cursor?: ImageCursor) =>
      (await listImages({ app: AllowedApp.LAURA, cursor, limit: 100 })).filter(
        ({ key }) => key.startsWith(KEY_PREFIX)
      );
    const [first, ...rest] = await ours();
    if (!first) {
      throw new Error("nothing listed");
    }
    await deleteImages([first.id]);
    const after = await ours({ createdAt: first.createdAt, id: first.id });
    expect(after.map(({ id }) => id)).toEqual(rest.map(({ id }) => id));
  });

  it("fills a Language missing from a stored alt with another's text", async () => {
    const [one] = await createImages([image("old", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", fr: "La mer" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "The sea" });
  });

  it("keeps a stored empty alt empty, since it marks a decorative Image", async () => {
    const [one] = await createImages([image("deco", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", it: "" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "" });
  });

  it("updates every change or none", async () => {
    const [one] = await createImages([image("one", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await expect(
      updateImages([
        { app: AllowedApp.ALL, id },
        { app: AllowedApp.ALL, id: "missing" },
      ])
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.app).toBe(AllowedApp.LAURA);

    const [moved] = await updateImages([{ app: AllowedApp.ALL, id }]);
    expect(moved?.app).toBe(AllowedApp.ALL);
  });

  it("accepts the same id twice in one batch", async () => {
    const [one] = await createImages([image("twice", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    const alt = { en: "new en", it: "new it" };
    await expect(updateImages([{ id }, { alt, id }])).resolves.toHaveLength(2);
    expect(await deleteImages([id, id])).toEqual([one?.key]);
  });

  it("deletes every id or none, returning the keys", async () => {
    const [one] = await createImages([image("gone", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await expect(deleteImages([id, "missing"])).rejects.toBeInstanceOf(
      ImageNotFoundError
    );
    expect(await getImage(id)).not.toBeNull();
    expect(await deleteImages([id])).toEqual([one?.key]);
    expect(await getImage(id)).toBeNull();
  });

  it("keeps an Image when its uploader is deleted", async () => {
    const [one] = await createImages([image("orphan", AllowedApp.LAURA)]);
    await prisma.user.delete({ where: { id: USER_ID } });
    expect((await getImage(one?.id ?? ""))?.uploadedBy).toBeNull();
  });
});
