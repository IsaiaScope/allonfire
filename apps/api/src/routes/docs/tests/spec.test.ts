// @module-tag unit
import { Hono } from "hono";
import { appDeps } from "../../../shared/tests/app-deps";
import type { AppBindings } from "../../../shared/types/bindings";
import { healthRoutes } from "../../health";
import { docsRoutes } from "..";

type Spec = {
  components?: { schemas?: Record<string, unknown> };
  paths: Record<
    string,
    {
      get: {
        responses: Record<
          string,
          { content?: Record<string, { schema?: object }> }
        >;
      };
    }
  >;
};

async function spec(): Promise<Spec> {
  const app = new Hono<AppBindings>().route("/", healthRoutes(appDeps()));
  const res = await app.route("/", docsRoutes(app)).request("/openapi.json");
  return (await res.json()) as Spec;
}

const bodySchema = (document: Spec, path: string, status: string) =>
  document.paths[path]?.get.responses[status]?.content?.["application/json"]
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
