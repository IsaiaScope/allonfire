// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { AUTH } from "../../../../shared/constants/auth";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import type { AuthEnv } from "../../types/variables";
import { type CanManage, manageGuard } from "../utils/manage-guard";

const PATH = "/managed";

const appWith = (canManage: CanManage, signedIn = true) => {
  const app = new Hono<AuthEnv>();
  app.use(async (context, next) => {
    context.set(AUTH.VAR.SESSION, signedIn ? sessionFor() : null);
    await next();
  });
  app.get(PATH, manageGuard(canManage), (context) => context.text("managed"));
  return app;
};

describe("manageGuard", () => {
  it("answers 401 without a Session, and never asks who may manage", async () => {
    const asked = vi.fn(() => Promise.resolve(true));
    const res = await appWith(asked, false).request(PATH);
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(asked).not.toHaveBeenCalled();
  });

  it("answers 403 when the User may not manage", async () => {
    const res = await appWith(() => Promise.resolve(false)).request(PATH);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("lets a User who may manage through, asking by their Session and their id", async () => {
    const asked = vi.fn<CanManage>(() => Promise.resolve(true));
    const res = await appWith(asked).request(PATH);
    const { session, user } = sessionFor();
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(asked).toHaveBeenCalledWith({
      sessionId: session.id,
      userId: user.id,
    });
  });
});
