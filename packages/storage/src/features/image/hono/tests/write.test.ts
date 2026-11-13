// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { errorOf, json } from "@allonfire/auth/shared/tests/test-host";
import { forbidden } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import {
  type AuthorisePlacements,
  type ImageChange,
  ImageNotFoundError,
  type ImagePlacementsById,
  type OpenedImage,
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
import {
  ALT,
  imageHost as app,
  imageRecord,
  PREPARED,
  upload,
  VERSION,
} from "./stub-image-deps";

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

/** One entry of `ImagePlacementsById`. */
type ImagePlacement =
  ImagePlacementsById extends ReadonlyMap<string, infer Placement>
    ? Placement
    : never;

/** The placements a write locks, as the database would find them. */
type Placements = (ids: readonly string[]) => Promise<ImagePlacementsById>;

/** Every Image of the batch, with the access given, in the Apps given. */
const placementsIn =
  (access: ImageAccess, ...apps: App[]): Placements =>
  (ids) =>
    Promise.resolve(
      new Map(
        ids.map((id): [string, ImagePlacement] => [
          id,
          { access, apps, key: lockedKey(id) },
        ])
      )
    );
/** Every Image in these tests is private in Laura unless a test says otherwise. */
const inLaura = placementsIn(ImageAccess.PRIVATE, App.LAURA);

/**
 * The delete services as the database runs them: the route's check against
 * the placements `placements` answers, then the write, recorded in `written`.
 */
const deletes = (placements: Placements, keys: string[] = []) => {
  const written = vi.fn<(ids: readonly string[], fromApp?: App) => void>();
  const run = async (
    ids: readonly string[],
    authorise: AuthorisePlacements,
    fromApp?: App
  ) => {
    const allowed = [...authorise(await placements(ids))];
    written(allowed, fromApp);
    return { deleted: allowed.length, keys };
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
 * out against the placements `placements` answers, recorded in `written` with the
 * Images and Versions it named (`opened`), and each changed Image comes back
 * as `answer` builds it.
 */
const updates = (
  placements: Placements,
  answer = (id: string) => imageRecord({ id })
) => {
  const written = vi.fn<(changes: ImageChange[]) => void>();
  const opened: OpenedImage[] = [];
  const updateImages: ImageDeps["updateImages"] = async (named, resolve) => {
    opened.push(...named);
    const changes = resolve(await placements(named.map(({ id }) => id)));
    written(changes);
    return changes.map(({ id }) => answer(id));
  };
  return { opened, updateImages, written };
};

/** An Admin PATCHes image-1 from Laura to the Back Office; `deps` is stubbed beside the update. */
const moveToBackOffice = async (deps: Partial<ImageDeps> = {}) => {
  const { updateImages, written } = updates(inLaura, (id) =>
    imageRecord({ apps: [App.BACK_OFFICE], id })
  );
  const res = await app(admin, { ...deps, updateImages }).request(
    STORAGE.PATH.IMAGES,
    json(HTTP.METHOD.PATCH, [
      { apps: [App.BACK_OFFICE], id: "image-1", version: VERSION },
    ])
  );
  return { res, written };
};

/**
 * PATCHes image-1, a public Laura Image read under `key`, to private: its
 * file copied (a no-op unless `deps` says) and the old one deleted.
 */
const makePrivate = async (
  key: string,
  deps: Pick<ImageDeps, "deleteObjects"> &
    Partial<Pick<ImageDeps, "copyObject">>
) => {
  const { updateImages, written } = updates(
    placementsIn(ImageAccess.PUBLIC, App.LAURA)
  );
  const res = await app(lauraAdmin, {
    copyObject: async () => undefined,
    ...deps,
    getImage: async () => imageRecord({ access: ImageAccess.PUBLIC, key }),
    updateImages,
  }).request(
    STORAGE.PATH.IMAGES,
    json(HTTP.METHOD.PATCH, [
      { access: ImageAccess.PRIVATE, id: "image-1", version: VERSION },
    ])
  );
  return { res, written };
};

/** image-1 private in Laura, image-2 private in the Back Office. */
const oneInEach: Placements = () =>
  Promise.resolve(
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

const imagesBody = z.array(imageBodySchema);
const IMAGE_KEY = /^[0-9a-f-]{36}\.avif$/;

const NO_APPS: App[] = [];
const LAURA_TWICE: App[] = [App.LAURA, App.LAURA];

describe("POST /images", () => {
  it("refuses a User who is Admin in no App before reading their upload", async () => {
    const res = await app(user).request(STORAGE.PATH.IMAGES, {
      body: "never parsed",
      method: HTTP.METHOD.POST,
    });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
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

    expect(res.status).toBe(HTTP.STATUS.CREATED);
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
    expect(res.status).toBe(HTTP.STATUS.CREATED);
    expect(createImages.mock.calls[0]?.[0][0]).toMatchObject({
      access: ImageAccess.PUBLIC,
      apps: [App.LAURA, App.BACK_OFFICE],
    });
  });

  it("refuses a USER", async () => {
    const res = await app(user, {}).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("lets an Admin of every App named upload it", async () => {
    const res = await app(lauraAdmin, {
      createImages: async (images) => images.map((image) => imageRecord(image)),
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(HTTP.STATUS.CREATED);
  });

  it("refuses an upload to an App the User is no Admin of, preparing nothing", async () => {
    const prepare = vi.fn();
    const res = await app(lauraAdmin, { prepare }).request(
      STORAGE.PATH.IMAGES,
      upload(1, { apps: [App.LAURA, App.BACK_OFFICE] })
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
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
      expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
      expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
      expect(prepare).not.toHaveBeenCalled();
    }
  );

  it("refuses meta that does not match the files", async () => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      upload(2, { metaCount: 1 })
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });
});

describe("POST /images refusals", () => {
  it("refuses a body over the upload limit through the host's onError", async () => {
    const res = await app(admin, {}).request(STORAGE.PATH.IMAGES, {
      body: "x",
      headers: {
        [HTTP.HEADER.CONTENT_LENGTH]: String(IMAGE.LIMIT.UPLOAD_BYTES + 1),
      },
      method: HTTP.METHOD.POST,
    });
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(body.values).toEqual({ limit: IMAGE.LIMIT.UPLOAD_BYTES });
  });

  it("refuses a file over the per-file limit, naming that limit", async () => {
    const res = await app(admin, {}).request(
      STORAGE.PATH.IMAGES,
      upload(1, { size: IMAGE.LIMIT.FILE_BYTES + 1 })
    );
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
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
    expect(res.status).toBe(HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE);
    expect((await errorOf(res)).code).toBe(IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE);
  });

  it("refuses an image over the pixel limit with its own 413", async () => {
    const res = await app(admin, {
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
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
    expect(res.status).toBe(HTTP.STATUS.SERVICE_UNAVAILABLE);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.TIMEOUT);
    expect(body.values).toEqual({
      seconds: IMAGE.LIMIT.UPLOAD_TIMEOUT_MS / UNIT.MS_PER_SECOND,
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
    expect((await pending).status).toBe(HTTP.STATUS.SERVICE_UNAVAILABLE);
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
    expect((await pending).status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
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
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    const putKeys = putObject.mock.calls.map(([key]) => key);
    expect(deleteObjects).toHaveBeenCalledWith(putKeys);
  });
});

describe("PATCH /images", () => {
  it("replaces the Apps of a batch", async () => {
    const { res, written } = await moveToBackOffice();
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(written).toHaveBeenCalledWith([
      { id: "image-1", place: [App.BACK_OFFICE], remove: [App.LAURA] },
    ]);
    expect(imagesBody.parse(await res.json())[0]?.apps).toEqual([
      App.BACK_OFFICE,
    ]);
  });

  it("answers 404 to an Admin of another App for an Image they cannot see", async () => {
    const { updateImages, written } = updates(inLaura);
    const res = await app(officeAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { apps: [App.LAURA, App.BACK_OFFICE], id: "image-1", version: VERSION },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect(written).not.toHaveBeenCalled();
  });

  it("sends nothing to write when the list is unchanged", async () => {
    const { updateImages, written } = updates(inLaura);
    const res = await app(lauraUser, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { apps: [App.LAURA], id: "image-1", version: VERSION },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(written).toHaveBeenCalledWith([{ id: "image-1" }]);
  });

  it("makes an Image public for an Admin of every App it is in", async () => {
    const { updateImages, written } = updates(
      placementsIn(ImageAccess.PRIVATE, App.LAURA, App.BACK_OFFICE)
    );
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { access: ImageAccess.PUBLIC, id: "image-1", version: VERSION },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(written).toHaveBeenCalledWith([
      { access: ImageAccess.PUBLIC, id: "image-1" },
    ]);
  });

  it("passes each Image's Version to updateImages", async () => {
    const { opened, updateImages } = updates(inLaura);
    await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [{ alt: ALT, id: "image-1", version: VERSION }])
    );
    expect(opened).toEqual([{ id: "image-1", version: VERSION }]);
  });

  it("the PATCH answer carries each Image's new Version", async () => {
    const { updateImages } = updates(inLaura, (id) =>
      imageRecord({ id, version: "version-2" })
    );
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [{ alt: ALT, id: "image-1", version: VERSION }])
    );
    expect(imagesBody.parse(await res.json())[0]?.version).toBe("version-2");
  });

  it("making a public Image private moves it to a copy, then deletes the old file", async () => {
    const OLD = lockedKey("image-1");
    const copyObject = vi.fn<ImageDeps["copyObject"]>(async () => undefined);
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const { res, written } = await makePrivate(OLD, {
      copyObject,
      deleteObjects,
    });
    expect(res.status).toBe(HTTP.STATUS.OK);
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
    const { res } = await makePrivate("old.avif", { deleteObjects });
    expect(res.status).toBe(HTTP.STATUS.OK);
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
    const { res } = await makePrivate(OLD, { deleteObjects });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(deleteObjects.mock.calls).toEqual([[[OLD]], [[OLD]]]);
  });

  /** Two public Images made private; the second one's copy fails. */
  const secondCopyFails = (deleteObjects: ImageDeps["deleteObjects"]) => {
    const copyObject = vi.fn<ImageDeps["copyObject"]>((from) =>
      from === lockedKey("image-2")
        ? Promise.reject(new Error("storage down"))
        : Promise.resolve()
    );
    const warn = vi.fn<ImageDeps["log"]["warn"]>();
    const pending = app(lauraAdmin, {
      copyObject,
      deleteObjects,
      getImage: async (id) =>
        imageRecord({ access: ImageAccess.PUBLIC, id, key: lockedKey(id) }),
      log: { warn },
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { access: ImageAccess.PRIVATE, id: "image-1", version: VERSION },
        { access: ImageAccess.PRIVATE, id: "image-2", version: VERSION },
      ])
    );
    /** The name the first Image's copy was given. */
    const firstCopy = () =>
      copyObject.mock.calls.find(
        ([from]) => from === lockedKey("image-1")
      )?.[1];
    return { firstCopy, pending, warn };
  };

  it("when one copy fails, the copies already made are deleted", async () => {
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const { firstCopy, pending, warn } = secondCopyFails(deleteObjects);
    const res = await pending;
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(firstCopy()).toMatch(IMAGE_KEY);
    expect(deleteObjects).toHaveBeenCalledWith([firstCopy()]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("when one copy fails and their delete fails too, the copies already made are logged", async () => {
    const cleanupFailure = new Error("storage still down");
    const { firstCopy, pending, warn } = secondCopyFails(() =>
      Promise.reject(cleanupFailure)
    );
    const res = await pending;
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(warn).toHaveBeenCalledWith(
      {
        err: cleanupFailure,
        event: IMAGE.LOG_EVENT.CLEANUP_FAILED,
        keys: [firstCopy()],
      },
      IMAGE.LOG_MESSAGE.CLEANUP_FAILED
    );
  });
});

describe("PATCH /images on a Version", () => {
  it("a stale Version answers 409 RESOURCE_CHANGED and writes nothing", async () => {
    // The service refuses before any write, under its lock.
    const res = await app(lauraAdmin, {
      updateImages: () => Promise.reject(new ResourceChangedError()),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { alt: ALT, id: "image-1", version: "version-0" },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.RESOURCE_CHANGED);
  });

  it("an emptied Image answers 409 RESOURCE_CHANGED, not 404", async () => {
    // Another change took it out of its other Apps first: the Image exists.
    const res = await app(admin, {
      updateImages: () => Promise.reject(new ResourceChangedError(["image-1"])),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { apps: [App.LAURA], id: "image-1", version: VERSION },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.RESOURCE_CHANGED);
  });

  it("refuses a change without a version before reading anything", async () => {
    const updateImages = vi.fn();
    const res = await app(admin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(updateImages).not.toHaveBeenCalled();
  });
});

describe("PATCH /images refusals", () => {
  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      updateImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [{ id: "missing", version: VERSION }])
    );
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("refuses an access change by an Admin of only one of the Image's Apps", async () => {
    const { updateImages, written } = updates(
      placementsIn(ImageAccess.PRIVATE, App.LAURA, App.BACK_OFFICE)
    );
    const res = await app(lauraAdmin, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [
        { access: ImageAccess.PUBLIC, id: "image-1", version: VERSION },
      ])
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(written).not.toHaveBeenCalled();
  });

  it.each([
    {
      case: "an alt-only edit by a User below Admin in one of the Image's Apps",
      placements: inLaura,
      session: lauraUser,
      status: HTTP.STATUS.FORBIDDEN,
    },
    {
      // Laura's Admin read it in Laura only; by the time the write locks it, a
      // Back Office Admin has placed it there too, so it is no longer theirs alone.
      case: "an alt edit checked against the placements the write locks",
      placements: placementsIn(ImageAccess.PRIVATE, App.LAURA, App.BACK_OFFICE),
      session: lauraAdmin,
      status: HTTP.STATUS.FORBIDDEN,
    },
    {
      case: "an Image in an App the User cannot enter",
      placements: placementsIn(ImageAccess.PRIVATE, App.BACK_OFFICE),
      session: lauraAdmin,
      status: HTTP.STATUS.NOT_FOUND,
    },
  ])("answers $status to $case", async ({ placements, session, status }) => {
    const { updateImages, written } = updates(placements);
    const res = await app(session, { updateImages }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.PATCH, [{ alt: ALT, id: "image-1", version: VERSION }])
    );
    expect(res.status).toBe(status);
    expect(written).not.toHaveBeenCalled();
  });
});

describe("DELETE /images", () => {
  it("answers 403 for a visible Image the User cannot manage, whatever else the batch names", async () => {
    // image-1 the User sees but cannot manage (403); image-2 they cannot see (skipped).
    const { services, written } = deletes(oneInEach);
    const res = await app(lauraUser, services).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1", "image-2"] })
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(written).not.toHaveBeenCalled();
  });

  it("skips an Image the User cannot see as it would an unknown one, and deletes the rest", async () => {
    // image-1 is the Admin's to delete; image-2 is not theirs to see.
    const { services, written } = deletes(oneInEach, ["image-1.avif"]);
    const res = await app(lauraAdmin, services).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1", "image-2"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: 1 });
    expect(written).toHaveBeenCalledWith(["image-1"], undefined);
  });

  it("deletes the rows, then the objects", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      deleteImages: () => {
        order.push("rows");
        return Promise.resolve({ deleted: 1, keys: ["a.avif"] });
      },
      deleteObjects: (keys) => {
        order.push(`objects:${keys.join()}`);
        return Promise.resolve();
      },
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: 1 });
    expect(order).toEqual(["rows", "objects:a.avif"]);
  });

  it("still answers 200 when storage fails after the rows are gone", async () => {
    const res = await app(admin, {
      deleteImages: async () => ({ deleted: 1, keys: ["a.avif"] }),
      deleteObjects: () => Promise.reject(new Error("storage down")),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
  });

  it("answers 200 with none deleted when no id is an Image the User can see", async () => {
    const res = await app(admin, {
      deleteImages: () => Promise.resolve({ deleted: 0, keys: [] }),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["missing"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: 0 });
  });

  it("takes the Images out of one App and removes the files of those left in none", async () => {
    const { services, written } = deletes(inLaura, ["a.avif"]);
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const res = await app(lauraAdmin, { ...services, deleteObjects }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(written).toHaveBeenCalledWith(["image-1"], App.LAURA);
    expect(deleteObjects).toHaveBeenCalledWith(["a.avif"]);
  });

  it("skips an Image not placed in the App named, as one that is not there", async () => {
    const { services, written } = deletes(
      placementsIn(ImageAccess.PRIVATE, App.BACK_OFFICE)
    );
    const res = await app(admin, services).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ deleted: 0 });
    expect(written).toHaveBeenCalledWith([], App.LAURA);
  });
});

describe("telling the host the bucket changed", () => {
  it("tells it once an upload has recorded its Images", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      changed: () => {
        order.push("changed");
        return Promise.resolve();
      },
      createImages: (rows) => {
        order.push("rows");
        return Promise.resolve(rows.map((row) => imageRecord(row)));
      },
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(STORAGE.PATH.IMAGES, upload(1));
    expect(res.status).toBe(HTTP.STATUS.CREATED);
    expect(order).toEqual(["rows", "changed"]);
  });

  it("tells it after a delete has removed the rows and the objects", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      changed: () => {
        order.push("changed");
        return Promise.resolve();
      },
      deleteImages: () => {
        order.push("rows");
        return Promise.resolve({ deleted: 1, keys: ["a.avif"] });
      },
      deleteObjects: () => {
        order.push("objects");
        return Promise.resolve();
      },
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(order).toEqual(["rows", "objects", "changed"]);
  });

  it("tells it after a change of Apps", async () => {
    const changed = vi.fn<ImageDeps["changed"]>(async () => undefined);
    const { res } = await moveToBackOffice({ changed });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("does not tell it of a delete that was refused", async () => {
    const changed = vi.fn<ImageDeps["changed"]>(async () => undefined);
    const res = await app(admin, {
      changed,
      deleteImages: () => Promise.reject(forbidden()),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["image-1"] })
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(changed).not.toHaveBeenCalled();
  });

  it("does not tell it of a delete that deleted nothing", async () => {
    const changed = vi.fn<ImageDeps["changed"]>(async () => undefined);
    await app(admin, {
      changed,
      deleteImages: () => Promise.resolve({ deleted: 0, keys: [] }),
    }).request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["missing"] })
    );
    expect(changed).not.toHaveBeenCalled();
  });
});
