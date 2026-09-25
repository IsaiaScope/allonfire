// @module-tag unit
import { Hono, type MiddlewareHandler } from "hono";
import { stubAuth } from "../../../shared/tests/stub-auth";
import { authLimit } from "../middleware/auth-limit";

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
