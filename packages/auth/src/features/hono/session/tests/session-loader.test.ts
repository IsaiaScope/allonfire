// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { AUTH } from "../../../../shared/constants/auth";
import { sessionFor, stubAuth } from "../../../../shared/tests/stub-auth";
import type { AuthEnv } from "../../types/variables";
import { sessionLoader } from "../middleware/session-loader";

/** A request to an app guarded by `sessionLoader`, with `cookie` set while the Session is read. */
const requestWithRefresh = (
  cookie: string,
  { cookieDomain, origin }: { cookieDomain?: string; origin?: string } = {}
) => {
  const auth = stubAuth({
    cookieDomain,
    getSession: (_headers, setCookie) => {
      setCookie?.(cookie);
      return Promise.resolve(sessionFor());
    },
  });
  const app = new Hono<AuthEnv>()
    .use(sessionLoader(auth))
    .get("/", (c) => c.text("ok"));
  return app.request("/", {
    headers: origin === undefined ? {} : { [HTTP.HEADER.ORIGIN]: origin },
  });
};

describe("sessionLoader", () => {
  it("passes on the cookies Better Auth sets while reading the Session", async () => {
    const cookie = `${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; HttpOnly`;

    const res = await requestWithRefresh(cookie);

    expect(res.headers.getSetCookie()).toEqual([cookie]);
  });

  // Local: a page on localhost calls the API whose cookies are set for the
  // tailnet's domain; a browser drops a cookie whose Domain does not cover it.
  it("takes the Domain off a refreshed cookie for an Origin outside the cookie domain", async () => {
    const res = await requestWithRefresh(
      `${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; Domain=.example.test; HttpOnly`,
      { cookieDomain: ".example.test", origin: "http://localhost:3400" }
    );

    expect(res.headers.getSetCookie()).toEqual([
      `${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; HttpOnly`,
    ]);
  });

  it("keeps the Domain of a refreshed cookie for an Origin under it", async () => {
    const cookie = `${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; Domain=.example.test; HttpOnly`;

    const res = await requestWithRefresh(cookie, {
      cookieDomain: ".example.test",
      origin: "https://app.example.test",
    });

    expect(res.headers.getSetCookie()).toEqual([cookie]);
  });

  it("forwards the request's cookie to getSession", async () => {
    let cookie: string | null = null;
    const auth = stubAuth({
      getSession: (headers) => {
        cookie = headers.get(HTTP.HEADER.COOKIE);
        return Promise.resolve(null);
      },
    });
    const app = new Hono<AuthEnv>()
      .use(sessionLoader(auth))
      .get("/", (c) => c.text("ok"));
    await app.request("/", { headers: { cookie: "a=1" } });
    expect(cookie).toBe("a=1");
  });

  it("lets a getSession failure surface as 500, never as anonymous", async () => {
    const auth = stubAuth({
      getSession: () => Promise.reject(new Error("db down")),
    });
    const app = new Hono<AuthEnv>()
      .use(sessionLoader(auth))
      .get("/", (c) => c.text("ok"));
    expect((await app.request("/")).status).toBe(
      HTTP.STATUS.INTERNAL_SERVER_ERROR
    );
  });
});
