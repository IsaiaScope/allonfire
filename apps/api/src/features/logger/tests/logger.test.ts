// @module-tag unit
import { captureLog } from "./capture";

describe("createLogger", () => {
  it("redacts the authorization header", () => {
    const { lines, logger } = captureLog();

    logger.info(
      { req: { headers: { authorization: "Bearer secret-token" } } },
      "req"
    );

    expect(JSON.stringify(lines)).not.toContain("secret-token");
    expect(JSON.stringify(lines)).toContain("[Redacted]");
  });

  it("redacts nested password fields", () => {
    const { lines, logger } = captureLog();

    logger.info({ body: { password: "hunter2" } }, "login");

    expect(JSON.stringify(lines)).not.toContain("hunter2");
  });
});
