// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { Hono, type MiddlewareHandler } from "hono";
import { sessionFor, stubAuth } from "../../../../shared/tests/stub-auth";
import type { AuthSession } from "../../../../shared/types/auth";
import { sessionLoader } from "../../session/middleware/session-loader";
import type { AuthEnv, SignedInEnv } from "../../types/variables";
import { requireApp } from "../middleware/require-app";
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

describe("requireApp", () => {
  it("allows a User whose Role in the App reaches its floor", async () => {
    const guard = requireApp(App.LAURA);
    const laura = (role: Role) =>
      sessionFor({ memberships: [{ app: App.LAURA, role }] });
    expect(await status(laura(Role.VIEWER), guard)).toBe(200);
    expect(await status(laura(Role.ADMIN), guard)).toBe(200);
  });

  it("refuses a User of another App, and a Role under the floor", async () => {
    const guard = requireApp(App.BACK_OFFICE);
    expect(
      await status(
        sessionFor({ memberships: [{ app: App.LAURA, role: Role.ADMIN }] }),
        guard
      )
    ).toBe(403);
    expect(
      await status(
        sessionFor({
          memberships: [{ app: App.BACK_OFFICE, role: Role.USER }],
        }),
        guard
      )
    ).toBe(403);
    expect(await status(null, guard)).toBe(401);
  });
});
