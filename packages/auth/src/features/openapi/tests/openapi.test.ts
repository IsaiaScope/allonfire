// @module-tag unit

import { stubAuth } from "../../../shared/tests/stub-auth";
import { AUTH_OPENAPI_TAG } from "../constants/openapi";
import { authOpenApi } from "../openapi";

const auth = stubAuth({
  basePath: "/v1/auth",
  openApi: () =>
    Promise.resolve({
      components: {
        schemas: { User: { type: "object" } },
        securitySchemes: { bearerAuth: { type: "http" } },
      },
      paths: {
        "/get-session": { get: { tags: ["Default"] } },
        "/sign-in/email": { post: { summary: "Sign in", tags: ["Default"] } },
      },
    }),
});

describe("authOpenApi", () => {
  it("prefixes every path with the base path", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.paths).toHaveProperty(["/v1/auth/sign-in/email"]);
    expect(fragment.paths).toHaveProperty(["/v1/auth/get-session"]);
    expect(fragment.paths).not.toHaveProperty(["/sign-in/email"]);
  });

  it("retags every operation and keeps the rest of it", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.paths["/v1/auth/sign-in/email"]?.post).toEqual({
      summary: "Sign in",
      tags: [AUTH_OPENAPI_TAG],
    });
    expect(fragment.tags).toEqual([{ name: AUTH_OPENAPI_TAG }]);
  });

  it("carries every component group so $refs still resolve", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.components).toEqual({
      schemas: { User: { type: "object" } },
      securitySchemes: { bearerAuth: { type: "http" } },
    });
  });
});
