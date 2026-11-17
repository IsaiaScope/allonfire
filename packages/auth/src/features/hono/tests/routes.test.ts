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

  describe("the Session cookies' Domain", () => {
    const DOMAIN = ".example.test";
    const COOKIE = `a=b; Max-Age=60; Domain=${DOMAIN}; Path=/; HttpOnly`;
    const appWith = (cookieDomain: string | undefined) =>
      new Hono().route(
        "/",
        authRoutes(
          stubAuth({
            basePath: HOST_AUTH_PATH,
            cookieDomain,
            handler: () =>
              Promise.resolve(
                new Response("handled", {
                  headers: [
                    [HTTP.HEADER.SET_COOKIE, COOKIE],
                    [HTTP.HEADER.SET_COOKIE, "c=d; Path=/"],
                  ],
                })
              ),
          })
        )
      );
    const cookiesFor = async (
      cookieDomain: string | undefined,
      origin: string | undefined
    ) =>
      (
        await appWith(cookieDomain).request(SIGN_IN, {
          headers: origin ? { [HTTP.HEADER.ORIGIN]: origin } : {},
          method: HTTP.METHOD.POST,
        })
      ).headers.getSetCookie();

    it("is kept for an App under the domain", async () => {
      expect(
        await cookiesFor(DOMAIN, "https://back-office.example.test")
      ).toEqual([COOKIE, "c=d; Path=/"]);
    });

    it("is dropped for an Origin outside it, so the browser keeps the cookie", async () => {
      expect(await cookiesFor(DOMAIN, "http://localhost:3400")).toEqual([
        "a=b; Max-Age=60; Path=/; HttpOnly",
        "c=d; Path=/",
      ]);
    });

    it("is kept when the request names no Origin", async () => {
      expect(await cookiesFor(DOMAIN, undefined)).toEqual([
        COOKIE,
        "c=d; Path=/",
      ]);
    });

    it("is left alone when the host sets no domain", async () => {
      expect(await cookiesFor(undefined, "http://localhost:3400")).toEqual([
        COOKIE,
        "c=d; Path=/",
      ]);
    });

    it("keeps the answer's body and status", async () => {
      const res = await appWith(DOMAIN).request(SIGN_IN, {
        headers: { [HTTP.HEADER.ORIGIN]: "http://localhost:3400" },
        method: HTTP.METHOD.POST,
      });
      expect(await res.text()).toBe("handled");
      expect(res.status).toBe(HTTP.STATUS.OK);
    });
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
