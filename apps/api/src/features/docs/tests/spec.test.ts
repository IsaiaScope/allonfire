// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
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
      get: operationSchema.optional(),
      post: operationSchema.optional(),
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

const bodySchema = (document: Spec, path: string, status: string) =>
  document.paths[path]?.get?.responses?.[status]?.content?.["application/json"]
    ?.schema;

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
});

describe("GET /openapi.json error responses", () => {
  it("documents the Image reads with no sign-in errors, the writes with them", async () => {
    const { paths } = await document();
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

  const problemSpecSchema = z.object({
    components: z.object({
      responses: z.record(z.string(), z.unknown()),
      schemas: z.record(
        z.string(),
        z.looseObject({
          properties: z.looseObject({
            code: z.looseObject({ enum: z.array(z.string()) }),
            status: z.looseObject({}),
          }),
        })
      ),
    }),
    paths: z.record(z.string(), z.record(z.string(), z.unknown())),
  });
  const document = async () =>
    problemSpecSchema.parse(
      await (await createApp(appDeps()).request(API.PATH.OPENAPI)).json()
    );

  it("lists, for each status, only the codes sent with it", async () => {
    const { components } = await document();
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

  it("points each Image route's error at its own status", async () => {
    const { paths } = await document();
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
