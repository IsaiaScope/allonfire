// @module-tag unit
import { AllowedApp, Role } from "@allonfire/database/enums";
import { Hono, type MiddlewareHandler } from "hono";
import { sessionFor, stubAuth } from "../../../shared/tests/stub-auth";
import type { AuthSession } from "../../../shared/types/auth";
import type { AuthEnv, SignedInEnv } from "../../../shared/types/variables";
import { sessionLoader } from "../../session/middleware/session-loader";
import { requireApp } from "../middleware/require-app";
import { requireRole } from "../middleware/require-role";
import { requireSession } from "../middleware/require-session";

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
