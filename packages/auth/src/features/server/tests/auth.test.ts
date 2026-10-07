// @module-tag unit

import { objectKeys } from "@allonfire/core/shared/utils/object";
import type { Role } from "@allonfire/database";
import {
  SESSION_EXPIRES_IN_S,
  SESSION_UPDATE_AGE_S,
} from "../../../shared/constants/limits";
import {
  OPENAPI_SCHEMA_PATH,
  SIGN_IN_EMAIL_PATH,
} from "../../../shared/constants/paths";
import { type Auth, createAuth, toAuthLike } from "../auth";

const BASE_URL = "http://localhost:3300";
const BASE_PATH = "/v1/auth";

const auth = createAuth({
  basePath: BASE_PATH,
  baseURL: BASE_URL,
  secret: "x".repeat(32),
  trustedOrigins: ["http://localhost:3200"],
});

describe("createAuth", () => {
  it("hands its basePath to the port, so adapters mount where it serves", () => {
    expect(toAuthLike(auth).basePath).toBe(BASE_PATH);
  });

  it("generates the OpenAPI schema in-process with paths relative to basePath", async () => {
    const document = await toAuthLike(auth).openApi();
    expect(objectKeys(document.paths)).toContain(SIGN_IN_EMAIL_PATH);
    expect(objectKeys(document.paths)).not.toContain(
      `${BASE_PATH}${SIGN_IN_EMAIL_PATH}`
    );
  });

  it("does not serve the schema over HTTP", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${OPENAPI_SCHEMA_PATH}`)
    );
    expect(res.status).toBe(404);
  });

  it("does not serve the plugin's reference page", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}/reference`)
    );
    expect(res.status).toBe(404);
  });

  it("keeps a Session 60 days, extended at most once a day", () => {
    expect(auth.options.session?.expiresIn).toBe(SESSION_EXPIRES_IN_S);
    expect(SESSION_EXPIRES_IN_S).toBe(60 * 24 * 60 * 60);
    expect(auth.options.session?.updateAge).toBe(SESSION_UPDATE_AGE_S);
  });

  it("types role as the Prisma Role union", () => {
    expectTypeOf<
      Auth["$Infer"]["Session"]["user"]["role"]
    >().toEqualTypeOf<Role>();
  });
});
