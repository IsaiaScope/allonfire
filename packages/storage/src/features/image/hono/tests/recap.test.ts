// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { json } from "@allonfire/auth/shared/tests/test-host";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import {
  type ImageChange,
  ImageNotFoundError,
  type ImagePlacementsById,
} from "@allonfire/database/features/image/image.service";
import { STORAGE } from "../../../../shared/constants/paths";
import { imagePageBodySchema } from "../constants/schemas";
import type { ImageDeps } from "../utils/deps";
import {
  ALT,
  imageHost,
  imageRecord,
  PREPARED,
  upload,
  VERSION,
} from "./stub-image-deps";

const { CREATED, FORBIDDEN, NOT_FOUND, OK, UNAUTHORIZED } = HTTP.STATUS;

/** One Image's path, as the module mounts it. */
const onePath = (id: string) =>
  `${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.ONE, { id })}`;

/**
 * The recap agreed for ADR 0020 and ADR 0027, one test per row. P is public,
 * in Laura and the Back Office; Q private in Laura, R private in the Back
 * office. Giulia is a Laura Viewer, Mario a Laura Admin outside the Back
 * office, Admin an Admin in every App.
 */
const P = imageRecord({
  access: ImageAccess.PUBLIC,
  apps: [App.LAURA, App.BACK_OFFICE],
  id: "P",
  key: "p.avif",
});
const Q = imageRecord({
  apps: [App.LAURA],
  id: "Q",
  key: "q.avif",
});
const R = imageRecord({
  apps: [App.BACK_OFFICE],
  id: "R",
  key: "r.avif",
});
const IMAGES = [P, Q, R];

const visitor: AuthSession | null = null;
const giulia = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const mario = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
});
const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });

/** One recap row: what each of the four callers gets. */
const row = (
  forVisitor: number,
  forGiulia: number,
  forMario: number,
  forAdmin: number
): [string, number, AuthSession | null][] => [
  ["a visitor", forVisitor, visitor],
  ["Giulia", forGiulia, giulia],
  ["Mario", forMario, mario],
  ["an Admin", forAdmin, admin],
];

/**
 * The service's query over P, Q and R: placed in `app` (any App when it is
 * left out), and public or in an App the caller enters.
 */
const listImagesPage: ImageDeps["listImagesPage"] = ({ app, enterable }) => {
  const images = IMAGES.filter(
    ({ access, apps }) =>
      (app === undefined || apps.includes(app)) &&
      (access === ImageAccess.PUBLIC ||
        apps.some((placed) => enterable.includes(placed)))
  );
  return Promise.resolve({
    images,
    total: images.length,
    totalBytes: images.reduce((sum, { bytes }) => sum + bytes, 0),
  });
};

/** The placements a delete locks: only the Images that exist, an unknown id is skipped. */
const existingPlacementsOf = (
  ids: readonly string[]
): Promise<ImagePlacementsById> =>
  Promise.resolve(
    new Map(
      IMAGES.filter(({ id }) => ids.includes(id)).map(
        ({ access, apps, id, key }) => [id, { access, apps, key }]
      )
    )
  );

/** The placements a write locks, as the database finds them in P, Q and R. */
const placementsOf = (ids: readonly string[]): Promise<ImagePlacementsById> => {
  const missing = ids.filter((id) => !IMAGES.some((image) => image.id === id));
  if (missing.length > 0) {
    return Promise.reject(new ImageNotFoundError(missing));
  }
  return Promise.resolve(
    new Map(
      IMAGES.filter(({ id }) => ids.includes(id)).map(
        ({ access, apps, id, key }) => [id, { access, apps, key }]
      )
    )
  );
};

const keysOf = (ids: readonly string[]) =>
  IMAGES.filter(({ id }) => ids.includes(id)).map(({ key }) => key);

/** Reads answer from P, Q and R; every write is recorded and succeeds. */
const host = (session: AuthSession | null) => {
  const writes = {
    copyObject: vi.fn<ImageDeps["copyObject"]>(async () => undefined),
    createImages: vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((one) => imageRecord(one))
    ),
    // The rows a delete takes, recorded only once the route's check passed.
    deleteImages: vi.fn((ids: readonly string[]) => ({
      deleted: ids.length,
      keys: keysOf(ids),
    })),
    deleteObjects: vi.fn<ImageDeps["deleteObjects"]>(async () => undefined),
    putObject: vi.fn<ImageDeps["putObject"]>(async () => undefined),
    // An Image goes when the App it leaves was its only one.
    removeImagesFromApp: vi.fn((ids: readonly string[], fromApp: App) => ({
      deleted: ids.length,
      keys: IMAGES.filter(
        ({ apps, id }) =>
          ids.includes(id) && apps.every((placed) => placed === fromApp)
      ).map(({ key }) => key),
    })),
    // The changes an update writes, worked out by the route's check.
    updateImages: vi.fn((changes: ImageChange[]) =>
      changes.map(({ id }) => imageRecord({ id }))
    ),
  };
  const app = imageHost(session, {
    ...writes,
    // As the database runs a delete: the check on the placements, then the rows.
    deleteImages: async (ids, authorise) =>
      writes.deleteImages([...authorise(await existingPlacementsOf(ids))]),
    getImage: async (id) => IMAGES.find((image) => image.id === id) ?? null,
    listImagesPage,
    prepare: async () => PREPARED,
    removeImagesFromApp: async (ids, fromApp, authorise) =>
      writes.removeImagesFromApp(
        [...authorise(await existingPlacementsOf(ids))],
        fromApp
      ),
    // As the database runs an update: the changes worked out on the placements.
    updateImages: async (opened, resolve) =>
      writes.updateImages(
        resolve(await placementsOf(opened.map(({ id }) => id)))
      ),
  });
  const wrote = () =>
    objectValues(writes).some((write) => write.mock.calls.length > 0);
  return { app, writes, wrote };
};

const listed = async (session: AuthSession | null, query: string) => {
  const res = await host(session).app.request(`${STORAGE.PATH.IMAGES}${query}`);
  return imagePageBodySchema.parse(await res.json()).images.map(({ id }) => id);
};

describe("recap: reads", () => {
  it.each([
    ["a visitor", visitor, ["P"]],
    ["Giulia", giulia, ["P", "Q"]],
    ["Mario", mario, ["P", "Q"]],
    ["an Admin", admin, ["P", "Q"]],
  ])("GET ?app=LAURA shows %s %j", async (_, session, expected) => {
    expect(await listed(session, `?app=${App.LAURA}`)).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, ["P"]],
    ["Giulia", giulia, ["P"]],
    ["Mario", mario, ["P"]],
    ["an Admin", admin, ["P", "R"]],
  ])("GET ?app=BACK_OFFICE shows %s %j", async (_, session, expected) => {
    expect(await listed(session, `?app=${App.BACK_OFFICE}`)).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, ["P"]],
    ["Giulia", giulia, ["P", "Q"]],
    ["Mario", mario, ["P", "Q"]],
    ["an Admin", admin, ["P", "Q", "R"]],
  ])("GET with no app shows %s %j", async (_, session, expected) => {
    expect(await listed(session, "")).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, NOT_FOUND, NOT_FOUND],
    ["Giulia", giulia, OK, NOT_FOUND],
    ["Mario", mario, OK, NOT_FOUND],
    ["an Admin", admin, OK, OK],
  ])("GET {Q} / GET {R} answer %s %i / %i", async (_, session, q, r) => {
    const { app } = host(session);
    expect((await app.request(onePath("Q"))).status).toBe(q);
    expect((await app.request(onePath("R"))).status).toBe(r);
  });
});

/** A PATCH of one change, on the Version every Image here holds. */
const patchOne = (change: {
  id: string;
  access?: ImageAccess;
  alt?: typeof ALT;
  apps?: App[];
}) => json(HTTP.METHOD.PATCH, [{ ...change, version: VERSION }]);

describe("recap: writes", () => {
  /** Each write row: its request, and what a visitor, Giulia, Mario and an Admin get. */
  const writes: [
    string,
    () => RequestInit,
    [number, number, number, number],
  ][] = [
    [
      "Upload to Laura + Back Office",
      () => upload(1, { apps: [App.LAURA, App.BACK_OFFICE] }),
      [UNAUTHORIZED, FORBIDDEN, FORBIDDEN, CREATED],
    ],
    [
      "PATCH Q make public",
      () => patchOne({ access: ImageAccess.PUBLIC, id: "Q" }),
      [UNAUTHORIZED, FORBIDDEN, OK, OK],
    ],
    [
      "PATCH P make private",
      () => patchOne({ access: ImageAccess.PRIVATE, id: "P" }),
      [UNAUTHORIZED, FORBIDDEN, FORBIDDEN, OK],
    ],
    [
      "PATCH P apps: [BACK_OFFICE]",
      () => patchOne({ apps: [App.BACK_OFFICE], id: "P" }),
      [UNAUTHORIZED, FORBIDDEN, OK, OK],
    ],
    [
      "PATCH P alt",
      () => patchOne({ alt: ALT, id: "P" }),
      [UNAUTHORIZED, FORBIDDEN, FORBIDDEN, OK],
    ],
    [
      "PATCH R",
      () => patchOne({ alt: ALT, id: "R" }),
      [UNAUTHORIZED, NOT_FOUND, NOT_FOUND, OK],
    ],
    [
      "DELETE { [P], LAURA }",
      () => json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["P"] }),
      [UNAUTHORIZED, FORBIDDEN, OK, OK],
    ],
    [
      "DELETE { [Q], LAURA }",
      () => json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["Q"] }),
      [UNAUTHORIZED, FORBIDDEN, OK, OK],
    ],
    [
      "DELETE { [P] }",
      () => json(HTTP.METHOD.DELETE, { ids: ["P"] }),
      [UNAUTHORIZED, FORBIDDEN, FORBIDDEN, OK],
    ],
    [
      "DELETE { [Q, R] }",
      () => json(HTTP.METHOD.DELETE, { ids: ["Q", "R"] }),
      [UNAUTHORIZED, FORBIDDEN, OK, OK],
    ],
  ];

  describe.each(writes)("%s", (_, request, [v, g, m, a]) => {
    it.each(row(v, g, m, a))(
      "answers %s %i, writing only when it succeeds",
      async (__, status, session) => {
        const { app, wrote } = host(session);
        const res = await app.request(STORAGE.PATH.IMAGES, request());
        expect({ status: res.status, wrote: wrote() }).toEqual({
          status,
          wrote: status < 400,
        });
      }
    );
  });

  it("PATCH P apps: [BACK_OFFICE] by Mario takes it out of Laura, P still public", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      STORAGE.PATH.IMAGES,
      patchOne({ apps: [App.BACK_OFFICE], id: "P" })
    );
    expect(done.updateImages).toHaveBeenCalledWith([
      { id: "P", remove: [App.LAURA] },
    ]);
  });

  it("DELETE { [P], LAURA } by Mario leaves P stored: it is still in the Back Office", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["P"] })
    );
    expect(done.removeImagesFromApp).toHaveBeenCalledWith(["P"], App.LAURA);
    expect(done.deleteImages).not.toHaveBeenCalled();
    expect(done.deleteObjects).not.toHaveBeenCalled();
  });

  it("DELETE { [Q], LAURA } by Mario deletes Q and its file: Laura was its only App", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { app: App.LAURA, ids: ["Q"] })
    );
    expect(done.deleteObjects).toHaveBeenCalledWith(["q.avif"]);
  });

  it("DELETE { [Q, R] } by Mario deletes Q and skips R, which he cannot see: it reads as an id that is not there", async () => {
    const { app, writes: done } = host(mario);
    const res = await app.request(
      STORAGE.PATH.IMAGES,
      json(HTTP.METHOD.DELETE, { ids: ["Q", "R"] })
    );
    expect(res.status).toBe(OK);
    expect(await res.json()).toEqual({ deleted: 1 });
    expect(done.deleteImages).toHaveBeenCalledWith(["Q"]);
    expect(done.deleteObjects).toHaveBeenCalledWith(["q.avif"]);
  });
});
