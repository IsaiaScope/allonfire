// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { AUTH } from "../../../../shared/constants/auth";
import { sessionFor, stubAuth } from "../../../../shared/tests/stub-auth";
import type { AuthEnv } from "../../types/variables";
import { sessionLoader } from "../middleware/session-loader";

describe("sessionLoader", () => {
  it("passes on the cookies Better Auth sets while reading the Session", async () => {
    const auth = stubAuth({
      getSession: (_headers, setCookie) => {
        setCookie?.(`${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; HttpOnly`);
        return Promise.resolve(sessionFor());
      },
    });
    const app = new Hono<AuthEnv>()
      .use(sessionLoader(auth))
      .get("/", (c) => c.text("ok"));

    const res = await app.request("/");

    expect(res.headers.getSetCookie()).toEqual([
      `${AUTH.COOKIE.SESSION_DATA}=fresh; Path=/; HttpOnly`,
    ]);
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
