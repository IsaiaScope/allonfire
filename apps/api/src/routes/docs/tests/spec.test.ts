// @module-tag unit
import { Hono } from "hono";
import { z } from "zod";
import { createApp } from "../../../app";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import type { AppBindings } from "../../../shared/types/bindings";
import { healthRoutes } from "../../health/index";
import { docsRoutes } from "..";

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
  const app = new Hono<AppBindings>().route("/", healthRoutes(appDeps()));
  const res = await app
    .route("/", docsRoutes(app, appDeps().auth))
    .request("/openapi.json");
  return specSchema.parse(await res.json());
}

const bodySchema = (document: Spec, path: string, status: string) =>
  document.paths[path]?.get?.responses?.[status]?.content?.["application/json"]
    ?.schema;

describe("GET /openapi.json", () => {
  it("types the probe bodies from their zod schemas", async () => {
    const document = await spec();

    expect(bodySchema(document, "/health", "200")).toMatchObject({
      properties: { status: {}, uptime: {}, version: {} },
    });
    // 200 only while Postgres answers; 503 only when it does not.
    expect(bodySchema(document, "/ready", "200")).toMatchObject({
      properties: {
        checks: { properties: { database: { const: "ok" } } },
        status: { enum: ["degraded", "ok"] },
      },
    });
    expect(bodySchema(document, "/ready", "503")).toMatchObject({
      properties: {
        checks: { properties: { database: { const: "unreachable" } } },
        status: { const: "unavailable" },
      },
    });
  });

  it("registers the problem document once, as a named schema", async () => {
    expect((await spec()).components?.schemas?.ProblemDetails).toMatchObject({
      properties: { code: {}, detail: {}, status: {}, title: {}, type: {} },
    });
  });
});

describe("GET /openapi.json with the Auth module", () => {
  it("documents Better Auth's endpoints under /v1/auth, tagged Auth", async () => {
    const auth = apiAuth({
      openApi: () =>
        Promise.resolve({
          components: { schemas: { Session: { type: "object" } } },
          paths: { "/sign-in/email": { post: { tags: ["Default"] } } },
        }),
    });
    const res = await createApp(appDeps({ auth })).request("/openapi.json");
    const document = specSchema.parse(await res.json());

    expect(document.paths).toHaveProperty(
      ["/v1/auth/sign-in/email", "post", "tags"],
      ["Auth"]
    );
    expect(document.paths).toHaveProperty(["/health"]);
    expect(document.paths).not.toHaveProperty(["/v1/auth/*"]);
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

    await app.request("/openapi.json");
    await app.request("/openapi.json");

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

    expect((await app.request("/openapi.json")).status).toBe(500);
    expect((await app.request("/openapi.json")).status).toBe(200);
  });
});
