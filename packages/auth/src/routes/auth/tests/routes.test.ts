// @module-tag unit
import { Hono } from "hono";
import { stubAuth } from "../../../shared/tests/stub-auth";
import { authRoutes } from "../index";

describe("authRoutes", () => {
  it("hands GET and POST to Better Auth with the original URL", async () => {
    const seen: string[] = [];
    const auth = stubAuth({
      basePath: "/v1/auth",
      handler: (request) => {
        seen.push(`${request.method} ${new URL(request.url).pathname}`);
        return Promise.resolve(new Response("handled"));
      },
    });
    const app = new Hono().route("/", authRoutes(auth));

    expect(await (await app.request("/v1/auth/get-session")).text()).toBe(
      "handled"
    );
    await app.request("/v1/auth/sign-in/email", { method: "POST" });

    expect(seen).toEqual([
      "GET /v1/auth/get-session",
      "POST /v1/auth/sign-in/email",
    ]);
  });

  it("does not answer other methods", async () => {
    const app = new Hono().route(
      "/",
      authRoutes(stubAuth({ basePath: "/v1/auth" }))
    );
    expect((await app.request("/v1/auth/x", { method: "PUT" })).status).toBe(
      404
    );
  });
});
