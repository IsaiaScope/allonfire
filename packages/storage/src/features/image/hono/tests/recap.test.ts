// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import {
  CONTENT_TYPE,
  HTTP_HEADER,
} from "@allonfire/core/features/http/constants/http";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { IMAGE_PATH } from "../../constants/paths";
import { imageListBodySchema } from "../constants/schemas";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { testHost } from "./test-host";

/**
 * The recap agreed for ADR 0020, one test per row. P is public in Laura and
 * private in the Back office, Q private in Laura, R private in the Back
 * office. Giulia is a Laura Viewer, Mario a Laura Admin outside the Back
 * office, Admin an Admin in every App.
 */
const P = imageRecord({
  apps: [
    { app: App.LAURA, public: true },
    { app: App.BACK_OFFICE, public: false },
  ],
  id: "P",
  key: "p.avif",
});
const Q = imageRecord({
  apps: [{ app: App.LAURA, public: false }],
  id: "Q",
  key: "q.avif",
});
const R = imageRecord({
  apps: [{ app: App.BACK_OFFICE, public: false }],
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
 * left out), and that placement public or in an App the caller enters.
 */
const listImages: ImageDeps["listImages"] = async ({ app, enterable }) =>
  IMAGES.filter(({ apps }) =>
    apps.some(
      (link) =>
        (app === undefined || link.app === app) &&
        (link.public || enterable.includes(link.app))
    )
  );

const linksOf: ImageDeps["linksOf"] = (ids) => {
  const missing = ids.filter((id) => !IMAGES.some((image) => image.id === id));
  if (missing.length > 0) {
    return Promise.reject(new ImageNotFoundError(missing));
  }
  return Promise.resolve(
    new Map(
      IMAGES.filter(({ id }) => ids.includes(id)).map(({ apps, id }) => [
        id,
        apps,
      ])
    )
  );
};

const keysOf = (ids: readonly string[]) =>
  IMAGES.filter(({ id }) => ids.includes(id)).map(({ key }) => key);

/** Reads answer from P, Q and R; every write is recorded and succeeds. */
const host = (session: AuthSession | null) => {
  const writes = {
    createImages: vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((one) => imageRecord(one))
    ),
    // The rows a delete takes, recorded only once the route's check passed.
    deleteImages: vi.fn((ids: readonly string[]) => keysOf(ids)),
    deleteObjects: vi.fn<ImageDeps["deleteObjects"]>(async () => undefined),
    putObject: vi.fn<ImageDeps["putObject"]>(async () => undefined),
    // An Image goes when the App it leaves was its only one.
    removeImagesFromApp: vi.fn((ids: readonly string[], fromApp: App) =>
      IMAGES.filter(
        ({ apps, id }) =>
          ids.includes(id) && apps.every((link) => link.app === fromApp)
      ).map(({ key }) => key)
    ),
    updateImages: vi.fn<ImageDeps["updateImages"]>(async (changes) =>
      changes.map(({ id }) => imageRecord({ id }))
    ),
  };
  const app = testHost(session, {
    ...writes,
    // As the database runs a delete: the check on the placements, then the rows.
    deleteImages: async (ids, authorise) => {
      authorise(await linksOf(ids));
      return writes.deleteImages(ids);
    },
    getImage: async (id) => IMAGES.find((image) => image.id === id) ?? null,
    linksOf,
    listImages,
    prepare: async () => ({
      blurDataUrl: "data:image/webp;base64,AAAA",
      buffer: Buffer.from("avif"),
      bytes: 4,
      height: 600,
      width: 800,
    }),
    removeImagesFromApp: async (ids, fromApp, authorise) => {
      authorise(await linksOf(ids));
      return writes.removeImagesFromApp(ids, fromApp);
    },
  });
  const wrote = () =>
    objectValues(writes).some((write) => write.mock.calls.length > 0);
  return { app, writes, wrote };
};

const ALT = { en: "The sea", it: "Il mare" };
const json = <T>(method: string, body: T & Json<T>) => ({
  body: stringifyJson(body),
  headers: { [HTTP_HEADER.CONTENT_TYPE]: CONTENT_TYPE.JSON },
  method,
});
const uploadToLauraAndBackOffice = () => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(10)], "a.jpg"));
  form.append(
    "meta",
    stringifyJson([
      { alt: ALT, apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE }] },
    ])
  );
  return { body: form, method: "POST" };
};

const listed = async (session: AuthSession | null, query: string) => {
  const res = await host(session).app.request(`${IMAGE_PATH}${query}`);
  return imageListBodySchema.parse(await res.json()).images.map(({ id }) => id);
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
    ["a visitor", visitor, []],
    ["Giulia", giulia, []],
    ["Mario", mario, []],
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
    ["a visitor", visitor, 404, 404],
    ["Giulia", giulia, 200, 404],
    ["Mario", mario, 200, 404],
    ["an Admin", admin, 200, 200],
  ])("GET {Q} / GET {R} answer %s %i / %i", async (_, session, q, r) => {
    const { app } = host(session);
    expect((await app.request(`${IMAGE_PATH}/Q`)).status).toBe(q);
    expect((await app.request(`${IMAGE_PATH}/R`)).status).toBe(r);
  });
});

describe("recap: writes", () => {
  /** Each write row: its request, and what a visitor, Giulia, Mario and an Admin get. */
  const writes: [
    string,
    () => RequestInit,
    [number, number, number, number],
  ][] = [
    [
      "Upload to Laura + Back office",
      uploadToLauraAndBackOffice,
      [401, 403, 403, 201],
    ],
    [
      "PATCH Q switch public in Laura",
      () =>
        json("PATCH", [{ apps: [{ app: App.LAURA, public: true }], id: "Q" }]),
      [401, 403, 200, 200],
    ],
    [
      "PATCH P apps: [BACK_OFFICE]",
      () => json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "P" }]),
      [401, 403, 200, 200],
    ],
    [
      "PATCH P alt",
      () => json("PATCH", [{ alt: ALT, id: "P" }]),
      [401, 403, 403, 200],
    ],
    [
      "PATCH R",
      () => json("PATCH", [{ alt: ALT, id: "R" }]),
      [401, 404, 404, 200],
    ],
    [
      "DELETE { [P], LAURA }",
      () => json("DELETE", { app: App.LAURA, ids: ["P"] }),
      [401, 403, 204, 204],
    ],
    [
      "DELETE { [Q], LAURA }",
      () => json("DELETE", { app: App.LAURA, ids: ["Q"] }),
      [401, 403, 204, 204],
    ],
    [
      "DELETE { [P] }",
      () => json("DELETE", { ids: ["P"] }),
      [401, 403, 403, 204],
    ],
    [
      "DELETE { [Q, R] }",
      () => json("DELETE", { ids: ["Q", "R"] }),
      [401, 404, 404, 204],
    ],
  ];

  describe.each(writes)("%s", (_, request, [v, g, m, a]) => {
    it.each(row(v, g, m, a))(
      "answers %s %i, writing only when it succeeds",
      async (__, status, session) => {
        const { app, wrote } = host(session);
        const res = await app.request(IMAGE_PATH, request());
        expect({ status: res.status, wrote: wrote() }).toEqual({
          status,
          wrote: status < 400,
        });
      }
    );
  });

  it("PATCH P apps: [BACK_OFFICE] by Mario keeps the Back office placement private", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      IMAGE_PATH,
      json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "P" }])
    );
    expect(done.updateImages).toHaveBeenCalledWith([
      { id: "P", remove: [App.LAURA] },
    ]);
  });

  it("DELETE { [P], LAURA } by Mario leaves P stored: it is still in the Back office", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      IMAGE_PATH,
      json("DELETE", { app: App.LAURA, ids: ["P"] })
    );
    expect(done.removeImagesFromApp).toHaveBeenCalledWith(["P"], App.LAURA);
    expect(done.deleteImages).not.toHaveBeenCalled();
    expect(done.deleteObjects).toHaveBeenCalledWith([]);
  });

  it("DELETE { [Q], LAURA } by Mario deletes Q and its file: Laura was its only App", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      IMAGE_PATH,
      json("DELETE", { app: App.LAURA, ids: ["Q"] })
    );
    expect(done.deleteObjects).toHaveBeenCalledWith(["q.avif"]);
  });

  it("DELETE { [Q, R] } by Mario deletes nothing, not even Q", async () => {
    const { app, wrote } = host(mario);
    const res = await app.request(
      IMAGE_PATH,
      json("DELETE", { ids: ["Q", "R"] })
    );
    expect(res.status).toBe(404);
    expect(wrote()).toBe(false);
  });
});
