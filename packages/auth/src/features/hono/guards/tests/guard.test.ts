// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { sessionFor, stubAuth } from "../../../../shared/tests/stub-auth";
import { sessionLoader } from "../../session/middleware/session-loader";
import type { AuthEnv } from "../../types/variables";
import { guard } from "../utils/guard";

/** The status a signed-in request gets past a guard whose answer comes later. */
const statusWhen = async (allowed: boolean) => {
  const app = new Hono<AuthEnv>()
    .use(
      sessionLoader(
        stubAuth({ getSession: () => Promise.resolve(sessionFor()) })
      )
    )
    .get(
      "/",
      guard(() => Promise.resolve(allowed)),
      (context) => context.text("ok")
    );
  return (await app.request("/")).status;
};

describe("guard", () => {
  it("awaits an async allows", async () => {
    expect(await statusWhen(false)).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await statusWhen(true)).toBe(HTTP.STATUS.OK);
  });
});
