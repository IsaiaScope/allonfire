// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AccessMembership } from "@allonfire/database/features/auth/access/access";
import { AUTH } from "../../../shared/constants/auth";
import { HOST_AUTH_PATH } from "../../../shared/tests/stub-auth";
import { type Auth, createAuth, toAuthLike } from "../auth";

const BASE_URL = LOCAL.URL.API;
const BASE_PATH = HOST_AUTH_PATH;

const auth = createAuth({
  basePath: BASE_PATH,
  baseURL: BASE_URL,
  secret: "x".repeat(32),
  trustedOrigins: [LOCAL.URL.LAURA],
});

describe("createAuth", () => {
  it("hands its basePath to the port, so adapters mount where it serves", () => {
    expect(toAuthLike(auth).basePath).toBe(BASE_PATH);
  });

  it("generates the OpenAPI schema in-process with paths relative to basePath", async () => {
    const document = await toAuthLike(auth).openApi();
    expect(objectKeys(document.paths)).toContain(AUTH.PATH.SIGN_IN_EMAIL);
    expect(objectKeys(document.paths)).not.toContain(
      `${BASE_PATH}${AUTH.PATH.SIGN_IN_EMAIL}`
    );
  });

  it("documents what joining an App answers on success", async () => {
    const document = await toAuthLike(auth).openApi();
    expect(document.paths[AUTH.PATH.JOIN_APP]?.post).toMatchObject({
      description: AUTH.DOC.JOIN_APP.DESCRIPTION,
      parameters: [{ in: "header", name: AUTH.HEADER.APP, required: true }],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                properties: { app: { enum: [App.LAURA, App.BACK_OFFICE] } },
              },
            },
          },
        },
      },
    });
  });

  it("does not serve the schema over HTTP", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${AUTH.PATH.OPENAPI_SCHEMA}`)
    );
    expect(res.status).toBe(404);
  });

  it("does not serve Better Auth's password check: a guess per request, outside the auth limit", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${AUTH.PATH.VERIFY_PASSWORD}`, {
        method: "POST",
      })
    );
    expect(res.status).toBe(404);
  });

  it("does not serve the plugin's reference page", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${AUTH.PATH.OPENAPI_REFERENCE}`)
    );
    expect(res.status).toBe(404);
  });

  it("keeps a Session 60 days, extended at most once a day", () => {
    expect(auth.options.session?.expiresIn).toBe(AUTH.SESSION.EXPIRES_IN_S);
    expect(AUTH.SESSION.EXPIRES_IN_S).toBe(60 * 24 * 60 * 60);
    expect(auth.options.session?.updateAge).toBe(AUTH.SESSION.UPDATE_AGE_S);
  });

  it("types the Session's Memberships from the database", () => {
    expectTypeOf<Auth["$Infer"]["Session"]["user"]["memberships"]>().toExtend<
      readonly AccessMembership[]
    >();
  });

  it("rate-limits Registration like sign-in: each attempt hashes a password", () => {
    expect(AUTH.LIMITED_PATHS).toContain(AUTH.PATH.SIGN_UP_EMAIL);
  });
});
