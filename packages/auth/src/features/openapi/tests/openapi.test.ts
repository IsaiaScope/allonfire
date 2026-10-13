// @module-tag unit

import { AUTH } from "../../../shared/constants/auth";
import { HOST_AUTH_PATH, stubAuth } from "../../../shared/tests/stub-auth";
import { authOpenApi } from "../openapi";

const SIGN_IN = `${HOST_AUTH_PATH}${AUTH.PATH.SIGN_IN_EMAIL}`;

const auth = stubAuth({
  basePath: HOST_AUTH_PATH,
  openApi: () =>
    Promise.resolve({
      components: {
        schemas: { User: { type: "object" } },
        securitySchemes: { bearerAuth: { type: "http" } },
      },
      paths: {
        [AUTH.PATH.GET_SESSION]: { get: { tags: ["Default"] } },
        [AUTH.PATH.SIGN_IN_EMAIL]: {
          post: { summary: "Sign in", tags: ["Default"] },
        },
      },
    }),
});

describe("authOpenApi", () => {
  it("prefixes every path with the base path", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.paths).toHaveProperty([SIGN_IN]);
    expect(fragment.paths).toHaveProperty([
      `${HOST_AUTH_PATH}${AUTH.PATH.GET_SESSION}`,
    ]);
    expect(fragment.paths).not.toHaveProperty([AUTH.PATH.SIGN_IN_EMAIL]);
  });

  it("retags every operation and keeps the rest of it", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.paths[SIGN_IN]?.post).toEqual({
      summary: "Sign in",
      tags: [AUTH.OPENAPI_TAG],
    });
    expect(fragment.tags).toEqual([{ name: AUTH.OPENAPI_TAG }]);
  });

  it("carries every component group so $refs still resolve", async () => {
    const fragment = await authOpenApi(auth);
    expect(fragment.components).toEqual({
      schemas: { User: { type: "object" } },
      securitySchemes: { bearerAuth: { type: "http" } },
    });
  });
});
