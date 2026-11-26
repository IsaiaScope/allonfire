// @module-tag unit

import { USER } from "@allonfire/auth/features/users/constants/users";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import {
  problemResponseName,
  problemResponses,
} from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  objectFromEntries,
  objectKeys,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { openApiPath } from "@allonfire/core/shared/utils/route-path";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { Hono } from "hono";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import type { AppBindings } from "../../../shared/types/bindings";
import { BACK_OFFICE } from "../../back-office/constants/back-office";
import { healthRoutes } from "../../health/routes/index";
import { LAURA } from "../../laura/constants/laura";
import { SERVICES } from "../../services/constants/services";
import { docsRoutes } from "../routes";

/** One Image's route, as OpenAPI spells it. */
const IMAGE_BY_ID_ROUTE = `${API.PATH.IMAGES}${openApiPath(STORAGE.PATH.ONE)}`;

/** One Image's Export route, as OpenAPI spells it. */
const IMAGE_EXPORT_ROUTE = `${API.PATH.IMAGES}${openApiPath(STORAGE.PATH.EXPORT)}`;

/** Only what these tests read; `looseObject` keeps the rest for `toMatchObject`. */
const operationSchema = z.object({
  responses: z
    .record(
      z.string(),
      z.object({
        content: z
          .record(
            z.string(),
            z.object({ schema: z.looseObject({}).optional() })
          )
          .optional(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

const specSchema = z.object({
  components: z
    .object({ schemas: z.record(z.string(), z.unknown()).optional() })
    .optional(),
  paths: z.record(
    z.string(),
    z.object({
      delete: operationSchema.optional(),
      get: operationSchema.optional(),
      patch: operationSchema.optional(),
      post: operationSchema.optional(),
      put: operationSchema.optional(),
    })
  ),
});

type Spec = z.infer<typeof specSchema>;

async function spec(): Promise<Spec> {
  const app = new Hono<AppBindings>().route(
    API.PATH.ROOT,
    healthRoutes(appDeps())
  );
  const res = await app
    .route(API.PATH.ROOT, docsRoutes(app, appDeps().auth))
    .request(API.PATH.OPENAPI);
  return specSchema.parse(await res.json());
}

const SCHEMA_REF = "#/components/schemas/";

/** The whole API's spec, for a test to parse with its own schema. */
const fullSpec = async (): Promise<unknown> =>
  (await createApp(appDeps()).request(API.PATH.OPENAPI)).json();

/** A response body's schema, followed through its `$ref` to the Model. */
const bodySchema = (document: Spec, path: string, status: string) => {
  const schema =
    document.paths[path]?.get?.responses?.[status]?.content?.[
      HTTP.CONTENT_TYPE.JSON
    ]?.schema;
  const ref = schema?.$ref;
  return typeof ref === "string"
    ? document.components?.schemas?.[ref.replace(SCHEMA_REF, "")]
    : schema;
};

describe("GET /openapi.json", () => {
  it("types the probe bodies from their zod schemas", async () => {
    const document = await spec();

    expect(bodySchema(document, API.PATH.HEALTH, "200")).toMatchObject({
      properties: { status: {}, uptime: {}, version: {} },
    });
    // 200 only while Postgres answers; 503 only when it does not.
    expect(bodySchema(document, API.PATH.READY, "200")).toMatchObject({
      properties: {
        checks: { properties: { database: { const: "ok" } } },
        status: { enum: ["degraded", "ok"] },
      },
    });
    expect(bodySchema(document, API.PATH.READY, "503")).toMatchObject({
      properties: {
        checks: { properties: { database: { const: "unreachable" } } },
        status: { const: "unavailable" },
      },
    });
  });

  it("lists every body the API sends or reads as a Model", async () => {
    const document = specSchema.parse(await fullSpec());

    expect(objectKeys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        "App",
        "Health",
        "Image",
        "ImageAccess",
        "ImageAlt",
        "ImageChange",
        "ImageDelete",
        "ImagePage",
        "ImageUpload",
        "SignedLink",
        "StorageOverview",
        "UserOverview",
        "UserAvatar",
        "Ready",
        "ListedUser",
        "ReadyUnavailable",
        "UserList",
      ])
    );
  });

  it("shows an Image's access, signed links and stored file name, and no per-App public", async () => {
    const schemas = specSchema.parse(await fullSpec()).components?.schemas;
    const image = z
      .object({ properties: z.record(z.string(), z.unknown()) })
      .parse(schemas?.Image);
    expect(objectKeys(image.properties)).toEqual(
      expect.arrayContaining(["access", "srcSet", "apps", "key"])
    );
    expect(objectKeys(schemas ?? {})).not.toContain("ImagePlacement");
  });

  it("leaves every Model untagged, so the docs list them apart", async () => {
    const schemas =
      specSchema.parse(await fullSpec()).components?.schemas ?? {};

    for (const schema of objectValues(schemas)) {
      expect(schema).not.toHaveProperty("x-tags");
    }
  });

  it("documents what each Image route reads", async () => {
    const operation = z.looseObject({
      parameters: z.array(z.looseObject({ name: z.string() })).optional(),
      requestBody: z
        .looseObject({
          content: z.record(z.string(), z.looseObject({ schema: z.unknown() })),
        })
        .optional(),
    });
    const { paths } = z
      .object({ paths: z.record(z.string(), z.record(z.string(), operation)) })
      .parse(await fullSpec());
    const images = paths[API.PATH.IMAGES];
    const json = (method: string) =>
      images?.[method]?.requestBody?.content[HTTP.CONTENT_TYPE.JSON]?.schema;

    expect(images?.get?.parameters?.map(({ name }) => name)).toEqual([
      "app",
      "page",
      "perPage",
      "search",
      "sort",
    ]);
    expect(images?.post?.requestBody?.content).toHaveProperty(
      [
        HTTP.CONTENT_TYPE.MULTIPART_FORM_DATA,
        "schema",
        "properties",
        "meta",
        "items",
      ],
      { $ref: `${SCHEMA_REF}ImageUpload` }
    );
    expect(images?.post?.requestBody?.content).toHaveProperty(
      [
        HTTP.CONTENT_TYPE.MULTIPART_FORM_DATA,
        "schema",
        "properties",
        "file",
        "items",
        "format",
      ],
      "binary"
    );
    expect(json("patch")).toMatchObject({
      items: { $ref: `${SCHEMA_REF}ImageChange` },
    });
    expect(json("delete")).toEqual({ $ref: `${SCHEMA_REF}ImageDelete` });
  });
});

describe("GET /openapi.json: the admin console", () => {
  it("lists the Users routes and the two overviews under the back-office prefix, the overviews under one overview prefix", async () => {
    const { paths } = z
      .object({ paths: z.record(z.string(), z.unknown()) })
      .parse(await fullSpec());
    const listed = objectKeys(paths);
    const underBackOffice = listed.filter((path) =>
      path.startsWith(`${API.PATH.VERSION}/back-office/`)
    );
    expect(underBackOffice).toEqual(
      expect.arrayContaining([
        API.PATH.BACK_OFFICE.USERS,
        `${API.PATH.BACK_OFFICE.USERS}${openApiPath(USER.PATH.ONE)}`,
        `${API.PATH.BACK_OFFICE.USERS}${openApiPath(USER.PATH.AVATAR)}`,
        API.PATH.BACK_OFFICE.OVERVIEW.USERS,
        API.PATH.BACK_OFFICE.OVERVIEW.STORAGE,
      ])
    );
    expect(underBackOffice).toHaveLength(5);
  });

  it("no longer lists the Users routes or the overviews at their old paths", async () => {
    const { paths } = z
      .object({ paths: z.record(z.string(), z.unknown()) })
      .parse(await fullSpec());
    const outside = objectKeys(paths).filter(
      (path) => !path.startsWith(`${API.PATH.BACK_OFFICE.BASE}/`)
    );
    const moved = [
      USER.PATH.BASE,
      BACK_OFFICE.OVERVIEW.STORAGE.PATH.BASE,
      BACK_OFFICE.OVERVIEW.USERS.PATH.BASE,
    ];
    expect(
      outside.filter((path) => moved.some((base) => path.includes(base)))
    ).toEqual([]);
  });
});

describe("GET /openapi.json: tags and their groups", () => {
  const groupedSpecSchema = z.object({
    paths: z.record(
      z.string(),
      z.record(z.string(), z.object({ tags: z.array(z.string()).optional() }))
    ),
    "x-tagGroups": z.array(
      z.object({ name: z.string(), tags: z.array(z.string()) })
    ),
  });
  const read = async () => groupedSpecSchema.parse(await fullSpec());
  const groupNamed = (
    document: z.infer<typeof groupedSpecSchema>,
    name: string
  ) => document["x-tagGroups"].find((group) => group.name === name)?.tags;
  const usedTags = (document: z.infer<typeof groupedSpecSchema>) => [
    ...new Set(
      objectValues(document.paths).flatMap((methods) =>
        objectValues(methods).flatMap((operation) => operation.tags ?? [])
      )
    ),
  ];

  it("groups the Back Office's tags and Laura's, so the docs nest them", async () => {
    const document = await read();
    expect(groupNamed(document, BACK_OFFICE.OPENAPI_GROUP)).toEqual([
      USER.OPENAPI_TAG,
      BACK_OFFICE.OVERVIEW.OPENAPI_TAG,
    ]);
    expect(groupNamed(document, LAURA.OPENAPI_GROUP)).toEqual([
      LAURA.GALLERY.OPENAPI_TAG,
      LAURA.FAVORITES.OPENAPI_TAG,
      LAURA.GAMES.OPENAPI_TAG,
    ]);
  });

  it("lists every tag an operation uses in exactly one group, and no tag that nothing uses", async () => {
    const document = await read();
    const grouped = document["x-tagGroups"].flatMap(({ tags }) => tags);
    const used = usedTags(document);
    expect(grouped).toEqual(expect.arrayContaining(used));
    // The Auth module describes its own endpoints, which this stub leaves out.
    expect(used).toEqual(
      expect.arrayContaining(grouped.filter((tag) => tag !== AUTH.OPENAPI_TAG))
    );
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("tags each route by its own feature, under its App's prefix", async () => {
    const { paths } = await read();
    const tagsUnder = (prefix: string) =>
      new Set(
        objectKeys(paths)
          .filter((path) => path.startsWith(`${prefix}/`))
          .flatMap((path) =>
            objectValues(paths[path] ?? {}).flatMap((op) => op.tags ?? [])
          )
      );
    expect(tagsUnder(API.PATH.BACK_OFFICE.BASE)).toEqual(
      new Set([USER.OPENAPI_TAG, BACK_OFFICE.OVERVIEW.OPENAPI_TAG])
    );
    expect(tagsUnder(API.PATH.LAURA.BASE)).toEqual(
      new Set([
        LAURA.GALLERY.OPENAPI_TAG,
        LAURA.FAVORITES.OPENAPI_TAG,
        LAURA.GAMES.OPENAPI_TAG,
      ])
    );
  });
});

describe("GET /openapi.json: Laura", () => {
  const LAURA_PATHS = [API.PATH.LAURA.GALLERY, API.PATH.LAURA.FAVORITES];
  const lauraSpecSchema = z.object({
    components: z.object({
      schemas: z.object({
        GalleryItem: z.object({ required: z.array(z.string()) }),
      }),
    }),
    paths: z.record(
      z.string(),
      z.object({
        get: z
          .object({
            responses: z.record(
              z.string(),
              z.looseObject({ $ref: z.string().optional() })
            ),
            tags: z.array(z.string()),
          })
          .optional(),
      })
    ),
  });

  it.each(LAURA_PATHS)(
    "lists %s under the Laura tag with the problem responses",
    async (path) => {
      const { paths } = lauraSpecSchema.parse(await fullSpec());
      const get = paths[path]?.get;
      expect(get?.tags).toHaveLength(1);
      expect(get?.responses[HTTP.STATUS.OK]).toBeDefined();
      for (const status of [
        HTTP.STATUS.BAD_REQUEST,
        HTTP.STATUS.UNAUTHORIZED,
        HTTP.STATUS.FORBIDDEN,
      ]) {
        expect(get?.responses[status]?.$ref).toBe(
          `#/components/responses/${problemResponseName(status)}`
        );
      }
    }
  );

  it("documents the Favorite writes with 401 and 403, and 404 for the mark", async () => {
    const { paths } = z
      .object({
        paths: z.record(
          z.string(),
          z.record(
            z.string(),
            z.object({ responses: z.record(z.string(), z.unknown()) })
          )
        ),
      })
      .parse(await fullSpec());
    const one =
      paths[`${LAURA_PATHS[1]}${openApiPath(LAURA.FAVORITES.PATH.ONE)}`];
    const codes = (method: string) =>
      objectKeys(one?.[method]?.responses ?? {});
    expect(codes("put")).toEqual(
      expect.arrayContaining([
        String(HTTP.STATUS.UNAUTHORIZED),
        String(HTTP.STATUS.FORBIDDEN),
        String(HTTP.STATUS.NOT_FOUND),
      ])
    );
    expect(codes("delete")).toEqual(
      expect.arrayContaining([
        String(HTTP.STATUS.UNAUTHORIZED),
        String(HTTP.STATUS.FORBIDDEN),
      ])
    );
  });

  it("makes the Favorite flag of a Gallery item required", async () => {
    const { components } = lauraSpecSchema.parse(await fullSpec());
    expect(components.schemas.GalleryItem.required).toContain("favorite");
  });
});

const problemSpecSchema = z.object({
  components: z.object({
    responses: z.record(z.string(), z.unknown()),
    schemas: z.looseObject(
      objectFromEntries(
        API.ERROR.STATUS.map(
          (status) =>
            [
              problemResponseName(status),
              z.looseObject({
                properties: z.looseObject({
                  code: z.looseObject({ enum: z.array(z.string()) }),
                  status: z.looseObject({}),
                }),
              }),
            ] as const
        )
      )
    ),
  }),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});
/** The served document, its problem schemas typed. */
const problemDocument = async () => problemSpecSchema.parse(await fullSpec());

/** The response a route's error at `status` points to: `{ $ref }`. */
const problemRefOf = <S extends number>(status: S) =>
  problemResponses(status)[status];

describe("GET /openapi.json: Laura games", () => {
  it("documents the three Memory operations with the problem responses and their models", async () => {
    const document = z
      .object({
        components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
        paths: z.record(
          z.string(),
          z.record(
            z.string(),
            z.object({
              responses: z.record(z.string(), z.unknown()),
              tags: z.array(z.string()),
            })
          )
        ),
      })
      .parse(await fullSpec());
    const { DECK, LEADERBOARD, SCORES } = API.PATH.LAURA.GAMES;
    const operations = [
      [document.paths[DECK]?.get, HTTP.STATUS.OK],
      [document.paths[LEADERBOARD]?.get, HTTP.STATUS.OK],
      [document.paths[SCORES]?.post, HTTP.STATUS.CREATED],
    ] as const;
    for (const [operation, success] of operations) {
      expect(operation?.tags).toEqual([LAURA.GAMES.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining([
          String(success),
          String(HTTP.STATUS.UNAUTHORIZED),
          String(HTTP.STATUS.FORBIDDEN),
        ])
      );
    }
    expect(objectKeys(document.paths[SCORES]?.post?.responses ?? {})).toContain(
      String(HTTP.STATUS.BAD_REQUEST)
    );
    expect(objectKeys(document.components.schemas)).toEqual(
      expect.arrayContaining([
        "MemoryDeck",
        "MemoryLeaderboard",
        "MemoryScore",
        "MemoryScoreInput",
      ])
    );
  });
});

describe("GET /openapi.json for the Image Export", () => {
  it("documents the Export as a JPEG, with its sign-in, hidden and limit errors", async () => {
    const { paths } = await problemDocument();
    expect(paths[IMAGE_EXPORT_ROUTE]).toHaveProperty(
      [
        "get",
        "responses",
        String(HTTP.STATUS.OK),
        "content",
        IMAGE.EXPORT.CONTENT_TYPE,
      ],
      expect.anything()
    );
    for (const status of [
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.TOO_MANY_REQUESTS,
    ]) {
      expect(paths[IMAGE_EXPORT_ROUTE]).toHaveProperty(
        ["get", "responses", String(status)],
        problemRefOf(status)
      );
    }
  });
});

describe("GET /openapi.json error responses", () => {
  it("documents the Image reads with no sign-in errors, the writes with them", async () => {
    const { paths } = await problemDocument();
    expect(paths[API.PATH.IMAGES]).not.toHaveProperty([
      "get",
      "responses",
      String(HTTP.STATUS.UNAUTHORIZED),
    ]);
    expect(paths[API.PATH.IMAGES]).not.toHaveProperty([
      "get",
      "responses",
      String(HTTP.STATUS.FORBIDDEN),
    ]);
    expect(paths[IMAGE_BY_ID_ROUTE]).not.toHaveProperty([
      "get",
      "responses",
      String(HTTP.STATUS.UNAUTHORIZED),
    ]);
    expect(paths[API.PATH.IMAGES]).toHaveProperty(
      ["patch", "responses", String(HTTP.STATUS.UNAUTHORIZED)],
      problemRefOf(HTTP.STATUS.UNAUTHORIZED)
    );
  });

  it("lists, for each status, only the codes sent with it", async () => {
    const { components } = await problemDocument();
    expect(
      components.schemas[problemResponseName(HTTP.STATUS.BAD_REQUEST)]
        ?.properties.code.enum
    ).toEqual([
      ERROR.CODE.BAD_REQUEST,
      LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE,
      SERVICES.ERROR_CODE.PROVIDER_INCOMPLETE,
      ERROR.CODE.VALIDATION_FAILED,
    ]);
    expect(
      components.schemas[problemResponseName(HTTP.STATUS.PAYLOAD_TOO_LARGE)]
        ?.properties
    ).toMatchObject({
      code: {
        enum: [IMAGE.ERROR_CODE.IMAGE_TOO_LARGE, ERROR.CODE.PAYLOAD_TOO_LARGE],
      },
      status: { const: HTTP.STATUS.PAYLOAD_TOO_LARGE },
    });
    expect(components.responses).toHaveProperty([
      problemResponseName(HTTP.STATUS.NOT_FOUND),
      "content",
    ]);
  });

  it.each([
    {
      method: "get",
      statuses: [
        HTTP.STATUS.OK,
        HTTP.STATUS.UNAUTHORIZED,
        HTTP.STATUS.FORBIDDEN,
      ],
    },
    {
      method: "post",
      statuses: [
        HTTP.STATUS.CREATED,
        HTTP.STATUS.BAD_REQUEST,
        HTTP.STATUS.UNAUTHORIZED,
        HTTP.STATUS.FORBIDDEN,
        HTTP.STATUS.CONFLICT,
      ],
    },
    {
      method: "delete",
      statuses: [
        HTTP.STATUS.OK,
        HTTP.STATUS.BAD_REQUEST,
        HTTP.STATUS.UNAUTHORIZED,
        HTTP.STATUS.FORBIDDEN,
      ],
    },
  ] as const)(
    "documents $method /users under Users, with its refusals",
    async ({ method, statuses }) => {
      const { paths } = specSchema.parse(await fullSpec());
      const operation = paths[API.PATH.BACK_OFFICE.USERS]?.[method];
      expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(statuses.map(String))
      );
    }
  );

  it("points each Image route's error at its own status", async () => {
    const { paths } = await problemDocument();
    expect(paths[API.PATH.IMAGES]).toHaveProperty(
      ["post", "responses", String(HTTP.STATUS.PAYLOAD_TOO_LARGE)],
      problemRefOf(HTTP.STATUS.PAYLOAD_TOO_LARGE)
    );
  });
});

describe("GET /openapi.json with the Auth module", () => {
  it("documents Better Auth's endpoints under /v1/auth, tagged Auth", async () => {
    const auth = apiAuth({
      openApi: () =>
        Promise.resolve({
          components: { schemas: { Session: { type: "object" } } },
          paths: { [AUTH.PATH.SIGN_IN_EMAIL]: { post: { tags: ["Default"] } } },
        }),
    });
    const res = await createApp(appDeps({ auth })).request(API.PATH.OPENAPI);
    const document = specSchema.parse(await res.json());

    expect(document.paths).toHaveProperty(
      [`${API.PATH.AUTH}${AUTH.PATH.SIGN_IN_EMAIL}`, "post", "tags"],
      ["Auth"]
    );
    expect(document.paths).toHaveProperty([API.PATH.HEALTH]);
    expect(document.paths).not.toHaveProperty([`${API.PATH.AUTH}/*`]);
    expect(document.components?.schemas).toHaveProperty(["Session"]);
  });
});

describe("GET /openapi.json beside Better Auth's own Models", () => {
  it("builds the document when Better Auth describes its User", async () => {
    const auth = apiAuth({
      openApi: () =>
        Promise.resolve({
          components: { schemas: { User: { type: "object" } } },
          paths: {},
        }),
    });
    const res = await createApp(appDeps({ auth })).request(API.PATH.OPENAPI);

    expect(res.status).toBe(HTTP.STATUS.OK);
  });
});

describe("GET /openapi.json caching", () => {
  it("builds the document once, not per request", async () => {
    let built = 0;
    const auth = apiAuth({
      openApi: () => {
        built += 1;
        return Promise.resolve({ paths: {} });
      },
    });
    const app = createApp(appDeps({ auth }));

    await app.request(API.PATH.OPENAPI);
    await app.request(API.PATH.OPENAPI);

    expect(built).toBe(1);
  });
});

describe("GET /openapi.json after a failed build", () => {
  it("tries again on the next request instead of caching the failure", async () => {
    let calls = 0;
    const auth = apiAuth({
      openApi: () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new Error("schema generation failed"))
          : Promise.resolve({ paths: {} });
      },
    });
    const app = createApp(appDeps({ auth }));

    expect((await app.request(API.PATH.OPENAPI)).status).toBe(
      HTTP.STATUS.INTERNAL_SERVER_ERROR
    );
    expect((await app.request(API.PATH.OPENAPI)).status).toBe(HTTP.STATUS.OK);
  });
});

describe("GET /openapi.json User writes", () => {
  it("lists the code a deletion of yourself answers", async () => {
    const { components } = await problemDocument();
    expect(
      components.schemas[problemResponseName(HTTP.STATUS.FORBIDDEN)]?.properties
        .code.enum
    ).toContain(USER.ERROR_CODE.CANNOT_DELETE_SELF);
  });

  it("lists the code a taken email answers", async () => {
    const { components } = await problemDocument();
    expect(
      components.schemas[problemResponseName(HTTP.STATUS.CONFLICT)]?.properties
        .code.enum
    ).toContain(USER.ERROR_CODE.EMAIL_TAKEN);
  });
});

describe("GET /openapi.json one User", () => {
  it.each([
    { method: "get", statuses: [] },
    { method: "patch", statuses: [HTTP.STATUS.BAD_REQUEST] },
  ] as const)(
    "documents $method on one User under Users",
    async ({ method, statuses }) => {
      const { paths } = specSchema.parse(await fullSpec());
      const operation =
        paths[`${API.PATH.BACK_OFFICE.USERS}${openApiPath(USER.PATH.ONE)}`]?.[
          method
        ];
      expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(
          [
            HTTP.STATUS.OK,
            HTTP.STATUS.UNAUTHORIZED,
            HTTP.STATUS.FORBIDDEN,
            HTTP.STATUS.NOT_FOUND,
            ...statuses,
          ].map(String)
        )
      );
    }
  );

  it("lists the code a change of your own Role answers", async () => {
    const { components } = await problemDocument();
    expect(
      components.schemas[problemResponseName(HTTP.STATUS.FORBIDDEN)]?.properties
        .code.enum
    ).toContain(USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE);
  });
});

describe("GET /openapi.json Avatars", () => {
  it.each([
    { method: "put", status: HTTP.STATUS.OK },
    { method: "delete", status: HTTP.STATUS.NO_CONTENT },
  ] as const)(
    "documents $method on a User's Avatar under Users",
    async ({ method, status }) => {
      const { paths } = specSchema.parse(await fullSpec());
      const operation =
        paths[
          `${API.PATH.BACK_OFFICE.USERS}${openApiPath(USER.PATH.AVATAR)}`
        ]?.[method];
      expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(
          [status, HTTP.STATUS.FORBIDDEN, HTTP.STATUS.NOT_FOUND].map(String)
        )
      );
    }
  );
});
