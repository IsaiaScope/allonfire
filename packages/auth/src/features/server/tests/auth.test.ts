// @module-tag unit
import type { Role } from "@allonfire/database";
import { objectKeys } from "@allonfire/utils/helpers/object";
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

  it("types role as the Prisma Role union", () => {
    expectTypeOf<
      Auth["$Infer"]["Session"]["user"]["role"]
    >().toEqualTypeOf<Role>();
  });
});
