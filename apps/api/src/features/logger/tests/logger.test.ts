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

  it.each([
    ["at the top", { password: "hunter2", token: "t0ken-value" }],
    [
      "two levels down",
      { body: { user: { password: "hunter2", token: "t0ken-value" } } },
    ],
  ])("redacts a password and a token %s", (_, logged) => {
    const { logger, output } = captureLog();

    logger.info(logged, "sign-in");

    expect(output()).not.toContain("hunter2");
    expect(output()).not.toContain("t0ken-value");
  });
});
