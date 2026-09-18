import { describe, expect, it } from "vitest";
import { createLogger } from "../logger";

function captureLines() {
  const lines: string[] = [];
  return {
    lines,
    stream: {
      write: (chunk: string) => {
        lines.push(chunk);
      },
    },
  };
}

describe("createLogger", () => {
  it("redacts the authorization header", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    logger.info(
      { req: { headers: { authorization: "Bearer secret-token" } } },
      "req"
    );

    expect(lines.join("")).not.toContain("secret-token");
    expect(lines.join("")).toContain("[Redacted]");
  });

  it("redacts nested password fields", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    logger.info({ body: { password: "hunter2" } }, "login");

    expect(lines.join("")).not.toContain("hunter2");
  });
});
