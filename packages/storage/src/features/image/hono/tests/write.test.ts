// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import {
  type AuthoriseLinks,
  type ImageChange,
  type ImageLink,
  type ImageLinksById,
  ImageNotFoundError,
} from "@allonfire/database/features/image/image.service";
import { z } from "zod";
import { STORAGE } from "../../../../shared/constants/paths";
import { IMAGE } from "../../constants/image";
import { imageBodySchema } from "../../constants/schemas";
import {
  ImageTooLargeError,
  UnsupportedImageError,
} from "../../prepare/prepare-image";
import type { ImageDeps } from "../utils/deps";
import { ALT, imageRecord, PREPARED } from "./stub-image-deps";
import { testHost as app, errorOf, json } from "./test-host";

const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });
const user = sessionFor({ memberships: membershipsIn(Role.USER) });
/** An Admin of Laura only. */
const lauraAdmin = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
});
/** A User of Laura, below Admin. */
const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.USER }],
});
/** An Admin of the Back Office only. */
const officeAdmin = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});

/** The file name a locked Image row holds, in these tests. */
const lockedKey = (id: string) => `${id}.avif`;

/** The placements a write locks, as the database would find them. */
type Links = (ids: readonly string[]) => Promise<ImageLinksById>;

/** Every Image of the batch private in the Apps given. */
const placedIn =
  (...apps: App[]): Links =>
  (ids) =>
    Promise.resolve(
      new Map(
        ids.map((id): [string, ImageLink] => [
          id,
          { access: ImageAccess.PRIVATE, apps, key: lockedKey(id) },
        ])
      )
    );
/** Every Image of the batch public in the Apps given. */
const publicIn =
  (...apps: App[]): Links =>
  (ids) =>
    Promise.resolve(
      new Map(
        ids.map((id): [string, ImageLink] => [
          id,
          { access: ImageAccess.PUBLIC, apps, key: lockedKey(id) },
        ])
      )
    );
/** Every Image in these tests is private in Laura unless a test says otherwise. */
const inLaura = placedIn(App.LAURA);

/**
 * The delete services as the database runs them: the route's check against
 * the placements `links` answers, then the write, recorded in `written`.
 */
const deletes = (links: Links, keys: string[] = []) => {
  const written = vi.fn<(ids: readonly string[], fromApp?: App) => void>();
  const run = async (
    ids: readonly string[],
    authorise: AuthoriseLinks,
    fromApp?: App
  ) => {
    authorise(await links(ids));
    written(ids, fromApp);
    return keys;
  };
  const services: Pick<ImageDeps, "deleteImages" | "removeImagesFromApp"> = {
    deleteImages: (ids, authorise) => run(ids, authorise),
    removeImagesFromApp: (ids, fromApp, authorise) =>
      run(ids, authorise, fromApp),
  };
  return { services, written };
};

/**
 * The update service as the database runs it: the route works its changes
 * out against the placements `links` answers, recorded in `written`, and each
 * changed Image comes back as `answer` builds it.
 */
const updates = (
  links: Links,
  answer = (id: string) => imageRecord({ id })
) => {
  const written = vi.fn<(changes: ImageChange[]) => void>();
  const updateImages: ImageDeps["updateImages"] = async (ids, resolve) => {
    const changes = resolve(await links(ids));
    written(changes);
    return changes.map(({ id }) => answer(id));
  };
  return { updateImages, written };
};

const imagesBody = z.array(imageBodySchema);
const IMAGE_KEY = /^[0-9a-f-]{36}\.avif$/;

const NO_APPS: App[] = [];
const LAURA_TWICE: App[] = [App.LAURA, App.LAURA];

/** What an upload sends beside its files; one meta entry per file unless `metaCount` says. */
type UploadOptions = {
  access?: ImageAccess;
  apps?: App[];
  metaCount?: number;
  size?: number;
};

const upload = (
  count: number,
  {
    access,
    apps = [App.LAURA],
    metaCount = count,
    size = 10,
  }: UploadOptions = {}
) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array(size)], `${index}.jpg`));
  }
  form.append(
    "meta",
    stringifyJson(
      Array.from({ length: metaCount }, () => ({
        alt: ALT,
        apps,
        ...(access && { access }),
      }))
    )
  );
  return { body: form, method: "POST" };
};

describe("POST /images", () => {
  it("refuses a User who is Admin in no App before reading their upload", async () => {
    const res = await app(user).request(STORAGE.PATH.IMAGES, {
      body: "never parsed",
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.FORBIDDEN);
  });

  it("prepares, stores and records a batch of one", async () => {
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row, index) => imageRecord({ ...row, id: `image-${index}` }))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject,
    }).request(STORAGE.PATH.IMAGES, upload(1));

    expect(res.status).toBe(201);
    const [key] = putObject.mock.calls[0] ?? [];
    expect(key).toMatch(IMAGE_KEY);
    expect(createImages).toHaveBeenCalledWith([
      {
        access: ImageAccess.PRIVATE,
        alt: ALT,
        apps: [App.LAURA],
        blurDataUrl: PREPARED.blurDataUrl,
        bytes: 4,
        height: 600,
        key,
        uploadedBy: admin.user.id,
        width: 800,
      },
    ]);
    expect(imagesBody.parse(await res.json())).toHaveLength(1);
  });

  it("keeps an Image uploaded public public, in every App it goes to", async () => {
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row) => imageRecord(row))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(
      STORAGE.PATH.IMAGES,
      upload(1, {
        access: ImageAccess.PUBLIC,
        apps: [App.LAURA, App.BACK_OFFICE],
      })
    );
    expect(res.status).toBe(201);
    expect(createImages.mock.calls[0]?.[0][0]).toMatchObject({
      access: ImageAccess.PUBLIC,
      apps: [App.LAURA, App.BACK_OFFICE],
    });
  });

  it("refuses a USER", async () => {
    const res = await app(user, {}).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(403);
  });

  it("lets an Admin of every App named upload it", async () => {
    const res = await app(lauraAdmin, {
      createImages: async (images) => images.map((image) => imageRecord(image)),
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(201);
  });

  it("refuses an upload to an App the User is no Admin of, preparing nothing", async () => {
    const prepare = vi.fn();
    const res = await app(lauraAdmin, { prepare }).request(
      STORAGE.PATH.IMAGES,
      upload(1, { apps: [App.LAURA, App.BACK_OFFICE] })
    );
    expect(res.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    ["no App", NO_APPS],
    ["one App twice", LAURA_TWICE],
  ])(
    "refuses meta placing an Image in %s, preparing nothing",
    async (_, apps) => {
      const prepare = vi.fn();
      const res = await app(admin, { prepare }).request(
        STORAGE.PATH.IMAGES,
        upload(1, { apps })
      );
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
      expect(prepare).not.toHaveBeenCalled();
    }
  );

  it("refuses meta that does not match the files", async () => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      upload(2, { metaCount: 1 })
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });
});

describe("POST /images refusals", () => {
  it("refuses a body over the upload limit through the host's onError", async () => {
    const res = await app(admin, {}).request(STORAGE.PATH.IMAGES, {
      body: "x",
      headers: { "content-length": String(IMAGE.LIMIT.UPLOAD_BYTES + 1) },
      method: "POST",
    });
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(body.values).toEqual({ limit: IMAGE.LIMIT.UPLOAD_BYTES });
  });

  it("refuses a file over the per-file limit, naming that limit", async () => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      upload(1, { size: IMAGE.LIMIT.FILE_BYTES + 1 })
    );
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(body.values).toEqual({ limit: IMAGE.LIMIT.FILE_BYTES });
  });

  it("rejects the whole batch when one file is not an image", async () => {
    let calls = 0;
    const res = await app(admin, {
      prepare: () => {
        calls += 1;
        return calls === 2
          ? Promise.reject(new UnsupportedImageError())
          : Promise.resolve(PREPARED);
      },
    }).request(STORAGE.PATH.IMAGES, upload(2));
    expect(res.status).toBe(415);
    expect((await errorOf(res)).code).toBe(IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE);
  });

  it("refuses an image over the pixel limit with its own 413", async () => {
    const res = await app(admin, {
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe(IMAGE.ERROR_CODE.IMAGE_TOO_LARGE);
    expect(body.values).toEqual({ limit: IMAGE.LIMIT.INPUT_MEGAPIXELS });
  });
});

describe("POST /images failures", () => {
  it("names its own time budget when the upload runs out of time", async () => {
    vi.useFakeTimers();
    const pending = app(admin, {
      prepare: () => new Promise(() => undefined),
    }).request(STORAGE.PATH.IMAGES, upload(1));
    await vi.advanceTimersByTimeAsync(IMAGE.LIMIT.UPLOAD_TIMEOUT_MS);
    const res = await pending;
    expect(res.status).toBe(503);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.TIMEOUT);
    expect(body.values).toEqual({
      seconds: IMAGE.LIMIT.UPLOAD_TIMEOUT_MS / 1000,
    });
  });

  it("stores and records nothing once the upload has run out of time", async () => {
    let release: () => void = () => undefined;
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const createImages = vi.fn<ImageDeps["createImages"]>(async () => []);
    vi.useFakeTimers();
    const pending = app(admin, {
      createImages,
      prepare: () =>
        new Promise((resolve) => {
          release = () => resolve(PREPARED);
        }),
      putObject,
    }).request(STORAGE.PATH.IMAGES, upload(1));
    await vi.advanceTimersByTimeAsync(IMAGE.LIMIT.UPLOAD_TIMEOUT_MS);
    expect((await pending).status).toBe(503);
    vi.useRealTimers();
    // The handler finishes preparing after the client already has its 503.
    release();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(putObject).not.toHaveBeenCalled();
    expect(createImages).not.toHaveBeenCalled();
  });

  it("cleans up only after every put has settled", async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let puts = 0;
    const pending = app(admin, {
      deleteObjects: () => {
        order.push("cleanup");
        return Promise.resolve();
      },
      prepare: async () => PREPARED,
      putObject: async () => {
        puts += 1;
        if (puts === 1) {
          throw new Error("storage down");
        }
        await gate;
        order.push("late put");
      },
    }).request(STORAGE.PATH.IMAGES, upload(2));
    await vi.waitFor(() => expect(puts).toBe(2));
    // With Promise.all the cleanup has already run here, before the slow put.
    release();
    expect((await pending).status).toBe(500);
    expect(order).toEqual(["late put", "cleanup"]);
  });

  it("deletes the stored objects when the rows cannot be written", async () => {
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const res = await app(admin, {
      createImages: () => Promise.reject(new Error("db down")),
      deleteObjects,
      prepare: async () => PREPARED,
      putObject,
    }).request(STORAGE.PATH.IMAGES, upload(2));
    expect(res.status).toBe(500);
    const putKeys = putObject.mock.calls.map(([key]) => key);
    expect(deleteObjects).toHaveBeenCalledWith(putKeys);
  });
});

describe("PATCH /images", () => {
  it("replaces the Apps of a batch", async () => {
    const { updateImages, written } = updates(inLaura, (id) =>
      imageRecord({ apps: [App.BACK_OFFICE], id })
    );
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps: [App.BACK_OFFICE], id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([
      { id: "image-1", place: [App.BACK_OFFICE], remove: [App.LAURA] },
    ]);
    expect(imagesBody.parse(await res.json())[0]?.apps).toEqual([
      App.BACK_OFFICE,
    ]);
  });

  it("answers 404 to an Admin of another App for an Image they cannot see", async () => {
    const { updateImages, written } = updates(placedIn(App.LAURA));
    const res = await app(officeAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps: [App.LAURA, App.BACK_OFFICE], id: "image-1" }])
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });

  it("sends nothing to write when the list is unchanged", async () => {
    const { updateImages, written } = updates(placedIn(App.LAURA));
    const res = await app(lauraUser, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps: [App.LAURA], id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([{ id: "image-1" }]);
  });

  it("makes an Image public for an Admin of every App it is in", async () => {
    const { updateImages, written } = updates(
      placedIn(App.LAURA, App.BACK_OFFICE)
    );
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ access: ImageAccess.PUBLIC, id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([
      { access: ImageAccess.PUBLIC, id: "image-1" },
    ]);
  });

  it("making a public Image private moves it to a copy, then deletes the old file", async () => {
    const OLD = lockedKey("image-1");
    const copyObject = vi.fn<ImageDeps["copyObject"]>(async () => undefined);
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const { updateImages, written } = updates(publicIn(App.LAURA));
    const res = await app(lauraAdmin, {
      copyObject,
      deleteObjects,
      getImage: async () =>
        imageRecord({ access: ImageAccess.PUBLIC, key: OLD }),
      updateImages,
    }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ access: ImageAccess.PRIVATE, id: "image-1" }])
    );
    expect(res.status).toBe(200);
    const [from, to] = copyObject.mock.calls[0] ?? [];
    expect(from).toBe(OLD);
    expect(to).toMatch(IMAGE_KEY);
    expect(written).toHaveBeenCalledWith([
      { access: ImageAccess.PRIVATE, id: "image-1", key: to },
    ]);
    expect(deleteObjects).toHaveBeenCalledWith([OLD]);
  });
});

describe("PATCH /images making an Image private, raced", () => {
  it("deletes the file the locked row names, not the one read before the lock", async () => {
    // Read as "old.avif"; meanwhile another PATCH made it private (a new
    // name) and a third public again, so the locked row names that file.
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const { updateImages } = updates(publicIn(App.LAURA));
    const res = await app(lauraAdmin, {
      copyObject: async () => undefined,
      deleteObjects,
      getImage: async () =>
        imageRecord({ access: ImageAccess.PUBLIC, key: "old.avif" }),
      updateImages,
    }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ access: ImageAccess.PRIVATE, id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(deleteObjects).toHaveBeenCalledWith([lockedKey("image-1")]);
  });
});

describe("PATCH /images making an Image private, with storage failing", () => {
  it("asks again to delete the old file: its public links must not outlive the change", async () => {
    const OLD = lockedKey("image-1");
    const deleteObjects = vi
      .fn<ImageDeps["deleteObjects"]>()
      .mockRejectedValueOnce(new Error("storage hiccup"))
      .mockResolvedValue(undefined);
    const { updateImages } = updates(publicIn(App.LAURA));
    const res = await app(lauraAdmin, {
      copyObject: async () => undefined,
      deleteObjects,
      getImage: async () =>
        imageRecord({ access: ImageAccess.PUBLIC, key: OLD }),
      updateImages,
    }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ access: ImageAccess.PRIVATE, id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(deleteObjects.mock.calls).toEqual([[[OLD]], [[OLD]]]);
  });
});

describe("PATCH /images refusals", () => {
  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      updateImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(STORAGE.PATH.IMAGES, json("PATCH", [{ id: "missing" }]));
    expect(res.status).toBe(404);
  });

  it("refuses an access change by an Admin of only one of the Image's Apps", async () => {
    const { updateImages, written } = updates(
      placedIn(App.LAURA, App.BACK_OFFICE)
    );
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ access: ImageAccess.PUBLIC, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(written).not.toHaveBeenCalled();
  });

  it("refuses an alt-only edit by a User below Admin in one of the Image's Apps", async () => {
    const { updateImages, written } = updates(inLaura);
    const res = await app(lauraUser, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(written).not.toHaveBeenCalled();
  });

  it("checks an alt edit against the placements the write locks", async () => {
    // Laura's Admin read it in Laura only; by the time the write locks it, a
    // Back Office Admin has placed it there too, so it is no longer theirs alone.
    const { updateImages, written } = updates(
      placedIn(App.LAURA, App.BACK_OFFICE)
    );
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(written).not.toHaveBeenCalled();
  });

  it("answers 404 for an Image in an App the User cannot enter", async () => {
    const { updateImages, written } = updates(placedIn(App.BACK_OFFICE));
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });

  it("answers 404 before 403 across the batch, so a refusal never tells which ids exist", async () => {
    // image-1 the User sees but cannot manage (403); image-2 they cannot see (404).
    const { updateImages, written } = updates(
      async () =>
        new Map([
          [
            "image-1",
            {
              access: ImageAccess.PRIVATE,
              apps: [App.LAURA],
              key: lockedKey("image-1"),
            },
          ],
          [
            "image-2",
            {
              access: ImageAccess.PRIVATE,
              apps: [App.BACK_OFFICE],
              key: lockedKey("image-2"),
            },
          ],
        ])
    );
    const res = await app(lauraUser, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [
        { alt: ALT, id: "image-1" },
        { alt: ALT, id: "image-2" },
      ])
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });

  it.each([
    ["no App", NO_APPS],
    ["one App twice", LAURA_TWICE],
  ])("refuses apps naming %s", async (_, apps) => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps, id: "image-1" }])
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });

  it("refuses alt missing a language", async () => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ alt: { en: "only English" }, id: "image-1" }])
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /images", () => {
  it("answers 404 before 403 across the batch, so a refusal never tells which ids exist", async () => {
    // image-1 the User sees but cannot manage (403); image-2 they cannot see (404).
    const { services, written } = deletes(
      async () =>
        new Map([
          [
            "image-1",
            {
              access: ImageAccess.PRIVATE,
              apps: [App.LAURA],
              key: lockedKey("image-1"),
            },
          ],
          [
            "image-2",
            {
              access: ImageAccess.PRIVATE,
              apps: [App.BACK_OFFICE],
              key: lockedKey("image-2"),
            },
          ],
        ])
    );
    const res = await app(lauraUser, services).request(
      STORAGE.PATH.IMAGES,
      json("DELETE", { ids: ["image-1", "image-2"] })
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });

  it("refuses a PATCH naming one Image twice before reading anything", async () => {
    const updateImages = vi.fn();
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [
        { alt: ALT, id: "image-1" },
        { alt: ALT, id: "image-1" },
      ])
    );
    expect(res.status).toBe(400);
    expect(updateImages).not.toHaveBeenCalled();
  });

  it("deletes the rows, then the objects", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      deleteImages: () => {
        order.push("rows");
        return Promise.resolve(["a.avif"]);
      },
      deleteObjects: (keys) => {
        order.push(`objects:${keys.join()}`);
        return Promise.resolve();
      },
    }).request(STORAGE.PATH.IMAGES, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
    expect(order).toEqual(["rows", "objects:a.avif"]);
  });

  it("still answers 204 when storage fails after the rows are gone", async () => {
    const res = await app(admin, {
      deleteImages: async () => ["a.avif"],
      deleteObjects: () => Promise.reject(new Error("storage down")),
    }).request(STORAGE.PATH.IMAGES, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
  });

  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      deleteImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(STORAGE.PATH.IMAGES, json("DELETE", { ids: ["missing"] }));
    expect(res.status).toBe(404);
  });

  it("takes the Images out of one App and removes the files of those left in none", async () => {
    const { services, written } = deletes(inLaura, ["a.avif"]);
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const res = await app(lauraAdmin, { ...services, deleteObjects }).request(
      STORAGE.PATH.IMAGES,
      json("DELETE", { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(204);
    expect(written).toHaveBeenCalledWith(["image-1"], App.LAURA);
    expect(deleteObjects).toHaveBeenCalledWith(["a.avif"]);
  });

  it("answers 404 for an Image not placed in the App named", async () => {
    const { services, written } = deletes(placedIn(App.BACK_OFFICE));
    const res = await app(admin, services).request(
      STORAGE.PATH.IMAGES,
      json("DELETE", { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });
});
