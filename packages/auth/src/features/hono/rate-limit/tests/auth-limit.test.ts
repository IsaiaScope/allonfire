// @module-tag unit
import { Hono, type MiddlewareHandler } from "hono";
import { AUTH } from "../../../../shared/constants/auth";
import { HOST_AUTH_PATH, stubAuth } from "../../../../shared/tests/stub-auth";
import { authLimit } from "../middleware/auth-limit";

const SIGN_IN = `${HOST_AUTH_PATH}${AUTH.PATH.SIGN_IN_EMAIL}`;
const CHANGE_PASSWORD = `${HOST_AUTH_PATH}${AUTH.PATH.CHANGE_PASSWORD}`;

describe("authLimit", () => {
  async function counted(path: string, method: string): Promise<number> {
    let calls = 0;
    const limiter: MiddlewareHandler = async (_context, next) => {
      calls += 1;
      await next();
    };
    const app = new Hono()
      .use(authLimit(stubAuth({ basePath: HOST_AUTH_PATH }), limiter))
      .all("*", (c) => c.text("ok"));
    await app.request(path, { method });
    return calls;
  }

  it("runs the limiter on POST sign-in, trailing slash or not", async () => {
    expect(await counted(SIGN_IN, "POST")).toBe(1);
    expect(await counted(`${SIGN_IN}/`, "POST")).toBe(1);
  });

  it("runs the limiter on POST change-password, which checks the current password", async () => {
    expect(await counted(CHANGE_PASSWORD, "POST")).toBe(1);
    expect(await counted(`${CHANGE_PASSWORD}/`, "POST")).toBe(1);
  });

  it("skips every other request", async () => {
    expect(await counted(SIGN_IN, "GET")).toBe(0);
    expect(
      await counted(`${HOST_AUTH_PATH}${AUTH.PATH.GET_SESSION}`, "POST")
    ).toBe(0);
    // Outside the mount point.
    expect(await counted(AUTH.PATH.SIGN_IN_EMAIL, "POST")).toBe(0);
  });
});
