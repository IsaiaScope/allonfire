// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import type { ImageLink } from "@allonfire/database/features/auth/access/access";
import {
  type AuthoriseLinks,
  type ImageChange,
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
const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const OFFICE_PUBLIC: ImageLink = { app: App.BACK_OFFICE, public: true };

/** The placements a write locks, as the database would find them. */
type Links = (ids: readonly string[]) => Promise<ImageLinksById>;

/** Every Image of the batch placed as given. */
const placedIn =
  (...links: ImageLink[]): Links =>
  (ids) =>
    Promise.resolve(new Map(ids.map((id) => [id, links])));
/** Every Image in these tests is private in Laura unless a test says otherwise. */
const inLaura = placedIn(LAURA_PRIVATE);

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

/** A placement as upload meta and PATCH send it: `public` may be left out. */
type LinkInput = { app: App; public?: boolean };
const NO_APPS: LinkInput[] = [];
const LAURA_TWICE: LinkInput[] = [
  { app: App.LAURA },
  { app: App.LAURA, public: true },
];

const upload = (
  count: number,
  metaCount = count,
  size = 10,
  apps: LinkInput[] = [{ app: App.LAURA }]
) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array(size)], `${index}.jpg`));
  }
  form.append(
    "meta",
    stringifyJson(Array.from({ length: metaCount }, () => ({ alt: ALT, apps })))
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
        alt: ALT,
        apps: [LAURA_PRIVATE],
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

  it("keeps a placement uploaded public, and makes one sent without `public` private", async () => {
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row) => imageRecord(row))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(
      STORAGE.PATH.IMAGES,
      upload(1, 1, 10, [
        { app: App.LAURA, public: true },
        { app: App.BACK_OFFICE },
      ])
    );
    expect(res.status).toBe(201);
    expect(createImages.mock.calls[0]?.[0][0]?.apps).toEqual([
      LAURA_PUBLIC,
      OFFICE_PRIVATE,
    ]);
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
      upload(1, 1, 10, [{ app: App.LAURA }, { app: App.BACK_OFFICE }])
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
        upload(1, 1, 10, apps)
      );
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
      expect(prepare).not.toHaveBeenCalled();
    }
  );

  it("refuses meta that does not match the files", async () => {
    const res = await app(admin, {}).request(STORAGE.PATH.IMAGES, upload(2, 1));
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
      upload(1, 1, IMAGE.LIMIT.FILE_BYTES + 1)
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
  it("replaces the placements of a batch", async () => {
    const { updateImages, written } = updates(inLaura, (id) =>
      imageRecord({ apps: [OFFICE_PRIVATE], id })
    );
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([
      { id: "image-1", place: [OFFICE_PRIVATE], remove: [App.LAURA] },
    ]);
    expect(imagesBody.parse(await res.json())[0]?.apps).toEqual([
      OFFICE_PRIVATE,
    ]);
  });

  it("keeps a public placement public when `public` is left out, and starts a new one private", async () => {
    const { updateImages, written } = updates(placedIn(LAURA_PUBLIC));
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [
        { apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE }], id: "image-1" },
      ])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([
      { id: "image-1", place: [OFFICE_PRIVATE] },
    ]);
  });

  it("needs no Admin in an App whose placement stays as it is", async () => {
    // Public in Laura, private in the Back Office: a Back Office Admin
    // switches only the Back Office placement, and Laura's stays.
    const { updateImages, written } = updates(
      placedIn(LAURA_PUBLIC, OFFICE_PRIVATE)
    );
    const res = await app(officeAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [
        {
          apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE, public: true }],
          id: "image-1",
        },
      ])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([
      { id: "image-1", place: [OFFICE_PUBLIC] },
    ]);
  });

  it("sends no placement to write when the list is unchanged", async () => {
    const { updateImages, written } = updates(placedIn(LAURA_PRIVATE));
    const res = await app(lauraUser, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ apps: [{ app: App.LAURA }], id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(written).toHaveBeenCalledWith([{ id: "image-1" }]);
  });
});

describe("PATCH /images refusals", () => {
  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      updateImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(STORAGE.PATH.IMAGES, json("PATCH", [{ id: "missing" }]));
    expect(res.status).toBe(404);
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
      placedIn(LAURA_PRIVATE, OFFICE_PRIVATE)
    );
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json("PATCH", [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(written).not.toHaveBeenCalled();
  });

  it("answers 404 for an Image in an App the User cannot enter", async () => {
    const { updateImages, written } = updates(placedIn(OFFICE_PRIVATE));
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
          ["image-1", [LAURA_PRIVATE]],
          ["image-2", [OFFICE_PRIVATE]],
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
          ["image-1", [LAURA_PRIVATE]],
          ["image-2", [OFFICE_PRIVATE]],
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
    const { services, written } = deletes(placedIn(OFFICE_PRIVATE));
    const res = await app(admin, services).request(
      STORAGE.PATH.IMAGES,
      json("DELETE", { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(404);
    expect(written).not.toHaveBeenCalled();
  });
});
