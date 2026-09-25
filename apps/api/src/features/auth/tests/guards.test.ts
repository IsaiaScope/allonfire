// @module-tag unit

import { requireRole } from "@allonfire/auth/hono/middleware/require-role";
import { requireSession } from "@allonfire/auth/hono/middleware/require-session";
import { sessionFor } from "@allonfire/auth/testing";
import type { AuthSession } from "@allonfire/auth/types";
import { Role } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../errors/tests/problem-of";

function guarded(session: AuthSession | null) {
  return createApp(
    appDeps({ auth: apiAuth({ getSession: () => Promise.resolve(session) }) })
  )
    .get("/v1/guarded", requireSession(), (c) => c.text("ok"))
    .get("/v1/mutate", requireRole(Role.USER), (c) => c.text("ok"));
}

describe("guards through the API", () => {
  it("renders 401 as a localised problem document", async () => {
    const res = await guarded(null).request("/v1/guarded", {
      headers: { "accept-language": "it" },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json"
    );
    const body = await problemOf(res);
    expect(body).toMatchObject({
      code: "UNAUTHORIZED",
      instance: "/v1/guarded",
      status: 401,
    });
    expect(body.detail).not.toBe("Authentication required");
  });

  it("renders 403 for a Viewer", async () => {
    const res = await guarded(sessionFor({ role: Role.VIEWER })).request(
      "/v1/mutate"
    );
    expect(res.status).toBe(403);
    expect((await problemOf(res)).code).toBe("FORBIDDEN");
  });

  it("renders a failing session lookup as 500", async () => {
    const app = createApp(
      appDeps({
        auth: apiAuth({
          getSession: () => Promise.reject(new Error("db down")),
        }),
      })
    ).get("/v1/guarded", requireSession(), (c) => c.text("ok"));
    const res = await app.request("/v1/guarded");
    expect(res.status).toBe(500);
    expect((await problemOf(res)).code).toBe("INTERNAL_ERROR");
  });
});

describe("cookies set while reading the Session", () => {
  it("reach the client on a 401 too, so an expired cookie is cleared", async () => {
    const cleared = "better-auth.session_token=; Max-Age=0; Path=/";
    const app = createApp(
      appDeps({
        auth: apiAuth({
          getSession: (_headers, setCookie) => {
            setCookie?.(cleared);
            return Promise.resolve(null);
          },
        }),
      })
    ).get("/v1/guarded", requireSession(), (c) => c.text("ok"));

    const res = await app.request("/v1/guarded");

    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie()).toEqual([cleared]);
  });
});
