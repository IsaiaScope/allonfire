// @module-tag unit

import { AllowedApp, Role } from "@allonfire/database/enums";
import { Hono, type MiddlewareHandler } from "hono";
import { sessionFor, stubAuth } from "../../testing/stub-auth";
import type { AuthSession } from "../../types/auth";
import { authLimit } from "../middleware/auth-limit";
import { requireApp } from "../middleware/require-app";
import { requireRole } from "../middleware/require-role";
import { requireSession } from "../middleware/require-session";
import { sessionLoader } from "../middleware/session-loader";
import type { AuthEnv, SignedInEnv } from "../types/variables";

async function status(
  session: AuthSession | null,
  guard: MiddlewareHandler<SignedInEnv>
): Promise<number> {
  const app = new Hono<AuthEnv>()
    .use(
      sessionLoader(stubAuth({ getSession: () => Promise.resolve(session) }))
    )
    .get("/", guard, (context) => context.text("ok"));
  return (await app.request("/")).status;
}

describe("requireSession", () => {
  it("401 when anonymous, 200 when signed in", async () => {
    expect(await status(null, requireSession())).toBe(401);
    expect(await status(sessionFor(), requireSession())).toBe(200);
  });

  it("401 when no loader ran", async () => {
    const app = new Hono<AuthEnv>().get("/", requireSession(), (c) =>
      c.text("ok")
    );
    expect((await app.request("/")).status).toBe(401);
  });
});

describe("requireRole", () => {
  it("passes the minimum Role and every Role above it", async () => {
    const guard = requireRole(Role.USER);
    expect(await status(sessionFor({ role: Role.VIEWER }), guard)).toBe(403);
    expect(await status(sessionFor({ role: Role.USER }), guard)).toBe(200);
    expect(await status(sessionFor({ role: Role.ADMIN }), guard)).toBe(200);
    expect(await status(null, guard)).toBe(401);
  });

  it("lets only ADMIN through requireRole(ADMIN)", async () => {
    const guard = requireRole(Role.ADMIN);
    expect(await status(sessionFor({ role: Role.ADMIN }), guard)).toBe(200);
    expect(await status(sessionFor({ role: Role.USER }), guard)).toBe(403);
  });
});

describe("requireApp", () => {
  it("allows the named App or all", async () => {
    const guard = requireApp(AllowedApp.LAURA);
    expect(
      await status(sessionFor({ allowedApps: [AllowedApp.LAURA] }), guard)
    ).toBe(200);
    expect(
      await status(sessionFor({ allowedApps: [AllowedApp.ALL] }), guard)
    ).toBe(200);
    expect(await status(sessionFor({ allowedApps: [] }), guard)).toBe(403);
  });
});

describe("sessionLoader", () => {
  it("passes on the cookies Better Auth sets while reading the Session", async () => {
    const auth = stubAuth({
      getSession: (_headers, setCookie) => {
        setCookie?.("better-auth.session_data=fresh; Path=/; HttpOnly");
        return Promise.resolve(sessionFor());
      },
    });
    const app = new Hono<AuthEnv>()
      .use(sessionLoader(auth))
      .get("/", (c) => c.text("ok"));

    const res = await app.request("/");

    expect(res.headers.getSetCookie()).toEqual([
      "better-auth.session_data=fresh; Path=/; HttpOnly",
    ]);
  });

  it("forwards the request's cookie to getSession", async () => {
    let cookie: string | null = null;
    const auth = stubAuth({
      getSession: (headers) => {
        cookie = headers.get("cookie");
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
    expect((await app.request("/")).status).toBe(500);
  });
});

describe("authLimit", () => {
  async function counted(path: string, method: string): Promise<number> {
    let calls = 0;
    const limiter: MiddlewareHandler = async (_context, next) => {
      calls += 1;
      await next();
    };
    const app = new Hono()
      .use(authLimit(stubAuth({ basePath: "/v1/auth" }), limiter))
      .all("*", (c) => c.text("ok"));
    await app.request(path, { method });
    return calls;
  }

  it("runs the limiter on POST sign-in, trailing slash or not", async () => {
    expect(await counted("/v1/auth/sign-in/email", "POST")).toBe(1);
    expect(await counted("/v1/auth/sign-in/email/", "POST")).toBe(1);
  });

  it("runs the limiter on POST change-password, which checks the current password", async () => {
    expect(await counted("/v1/auth/change-password", "POST")).toBe(1);
    expect(await counted("/v1/auth/change-password/", "POST")).toBe(1);
  });

  it("skips every other request", async () => {
    expect(await counted("/v1/auth/sign-in/email", "GET")).toBe(0);
    expect(await counted("/v1/auth/get-session", "POST")).toBe(0);
    expect(await counted("/sign-in/email", "POST")).toBe(0);
  });
});
