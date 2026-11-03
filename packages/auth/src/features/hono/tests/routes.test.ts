// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { AUTH } from "../../../shared/constants/auth";
import { HOST_AUTH_PATH, stubAuth } from "../../../shared/tests/stub-auth";
import { authRoutes } from "../routes";

const GET_SESSION = `${HOST_AUTH_PATH}${AUTH.PATH.GET_SESSION}`;
const SIGN_IN = `${HOST_AUTH_PATH}${AUTH.PATH.SIGN_IN_EMAIL}`;

describe("authRoutes", () => {
  it("hands GET and POST to Better Auth with the original URL", async () => {
    const seen: string[] = [];
    const auth = stubAuth({
      basePath: HOST_AUTH_PATH,
      handler: (request) => {
        seen.push(`${request.method} ${new URL(request.url).pathname}`);
        return Promise.resolve(new Response("handled"));
      },
    });
    const app = new Hono().route("/", authRoutes(auth));

    expect(await (await app.request(GET_SESSION)).text()).toBe("handled");
    await app.request(SIGN_IN, { method: HTTP.METHOD.POST });

    expect(seen).toEqual([`GET ${GET_SESSION}`, `POST ${SIGN_IN}`]);
  });

  it("does not answer other methods", async () => {
    const app = new Hono().route(
      "/",
      authRoutes(stubAuth({ basePath: HOST_AUTH_PATH }))
    );
    expect(
      (await app.request(GET_SESSION, { method: HTTP.METHOD.PUT })).status
    ).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
