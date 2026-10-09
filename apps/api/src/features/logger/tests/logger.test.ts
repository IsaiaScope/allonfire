// @module-tag unit
import { captureLog } from "./capture";

describe("createLogger", () => {
  it("redacts the authorization header", () => {
    const { logger, output } = captureLog();

    logger.info(
      { req: { headers: { authorization: "Bearer secret-token" } } },
      "req"
    );

    expect(output()).not.toContain("secret-token");
    expect(output()).toContain("[Redacted]");
  });

  it("redacts nested password fields", () => {
    const { logger, output } = captureLog();

    logger.info({ body: { password: "hunter2" } }, "sign-in");

    expect(output()).not.toContain("hunter2");
  });
});
