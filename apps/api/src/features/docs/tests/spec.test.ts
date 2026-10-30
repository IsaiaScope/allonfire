// @module-tag unit

import { USER } from "@allonfire/auth/features/users/constants/users";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { problemResponseName } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  objectFromEntries,
  objectKeys,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { Hono } from "hono";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import type { AppBindings } from "../../../shared/types/bindings";
import { healthRoutes } from "../../health/routes/index";
import { docsRoutes } from "../routes";

/** OpenAPI spells a path parameter `{id}`, where Hono spells it `:id`. */
const IMAGE_BY_ID_ROUTE = `${API.PATH.IMAGES}/{id}`;

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
        "ImageList",
        "ImageUpload",
        "SignedLink",
        "UserAvatar",
        "Ready",
        "ListedUser",
        "ReadyUnavailable",
        "UserList",
      ])
    );
  });

  it("shows an Image's access and signed links, and no per-App public or file name", async () => {
    const schemas = specSchema.parse(await fullSpec()).components?.schemas;
    const image = z
      .object({ properties: z.record(z.string(), z.unknown()) })
      .parse(schemas?.Image);
    expect(objectKeys(image.properties)).toEqual(
      expect.arrayContaining(["access", "srcSet", "apps"])
    );
    expect(objectKeys(image.properties)).not.toContain("key");
    expect(objectKeys(schemas ?? {})).not.toContain("ImageLink");
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
      "cursor",
      "limit",
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

describe("GET /openapi.json error responses", () => {
  it("documents the Image reads with no sign-in errors, the writes with them", async () => {
    const { paths } = await problemDocument();
    expect(paths[API.PATH.IMAGES]).not.toHaveProperty([
      "get",
      "responses",
      "401",
    ]);
    expect(paths[API.PATH.IMAGES]).not.toHaveProperty([
      "get",
      "responses",
      "403",
    ]);
    expect(paths[IMAGE_BY_ID_ROUTE]).not.toHaveProperty([
      "get",
      "responses",
      "401",
    ]);
    expect(paths[API.PATH.IMAGES]).toHaveProperty(
      ["patch", "responses", "401", "$ref"],
      "#/components/responses/Problem401"
    );
  });

  it("lists, for each status, only the codes sent with it", async () => {
    const { components } = await problemDocument();
    expect(components.schemas.Problem400?.properties.code.enum).toEqual([
      ERROR.CODE.BAD_REQUEST,
      ERROR.CODE.VALIDATION_FAILED,
    ]);
    expect(components.schemas.Problem413?.properties).toMatchObject({
      code: {
        enum: [IMAGE.ERROR_CODE.IMAGE_TOO_LARGE, ERROR.CODE.PAYLOAD_TOO_LARGE],
      },
      status: { const: 413 },
    });
    expect(components.responses).toHaveProperty(["Problem404", "content"]);
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
      const operation = paths[API.PATH.USERS]?.[method];
      expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(statuses.map(String))
      );
    }
  );

  it("points each Image route's error at its own status", async () => {
    const { paths } = await problemDocument();
    expect(paths[API.PATH.IMAGES]).toHaveProperty(
      ["post", "responses", "413", "$ref"],
      "#/components/responses/Problem413"
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

    expect((await app.request(API.PATH.OPENAPI)).status).toBe(500);
    expect((await app.request(API.PATH.OPENAPI)).status).toBe(200);
  });
});

describe("GET /openapi.json User writes", () => {
  it("documents deleting Users, and the code a deletion of yourself answers", async () => {
    const { paths } = specSchema.parse(await fullSpec());
    const operation = paths[API.PATH.USERS]?.delete;
    expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
    expect(objectKeys(operation?.responses ?? {})).toEqual(
      expect.arrayContaining(
        [
          HTTP.STATUS.OK,
          HTTP.STATUS.BAD_REQUEST,
          HTTP.STATUS.UNAUTHORIZED,
          HTTP.STATUS.FORBIDDEN,
        ].map(String)
      )
    );
    const { components } = await problemDocument();
    expect(components.schemas.Problem403?.properties.code.enum).toContain(
      USER.ERROR_CODE.CANNOT_DELETE_SELF
    );
  });

  it("documents adding a User, and the code a taken email answers", async () => {
    const { paths } = specSchema.parse(await fullSpec());
    const operation = paths[API.PATH.USERS]?.post;
    expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
    expect(objectKeys(operation?.responses ?? {})).toEqual(
      expect.arrayContaining(
        [
          HTTP.STATUS.CREATED,
          HTTP.STATUS.BAD_REQUEST,
          HTTP.STATUS.UNAUTHORIZED,
          HTTP.STATUS.FORBIDDEN,
          HTTP.STATUS.CONFLICT,
        ].map(String)
      )
    );
    const { components } = await problemDocument();
    expect(components.schemas.Problem409?.properties.code.enum).toContain(
      USER.ERROR_CODE.EMAIL_TAKEN
    );
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
        paths[`${API.PATH.USERS}${USER.PATH.ONE.replace(":id", "{id}")}`]?.[
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
    expect(components.schemas.Problem403?.properties.code.enum).toContain(
      USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE
    );
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
        paths[`${API.PATH.USERS}${USER.PATH.AVATAR.replace(":id", "{id}")}`]?.[
          method
        ];
      expect(operation?.tags).toEqual([USER.OPENAPI_TAG]);
      expect(objectKeys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(
          [status, HTTP.STATUS.FORBIDDEN, HTTP.STATUS.NOT_FOUND].map(String)
        )
      );
    }
  );
});
