import { describe, expect, it } from "vitest";
import { createLogger } from "../../logger/logger";
import { pinoDiagLogger } from "../telemetry";

describe("pinoDiagLogger", () => {
  it("writes OpenTelemetry's own failures to the API log", () => {
    const lines: { level: number; msg: string }[] = [];
    const logger = createLogger({
      destination: { write: (chunk: string) => lines.push(JSON.parse(chunk)) },
    });

    pinoDiagLogger(logger).warn("export failed", new Error("ECONNREFUSED"));

    expect(lines).toEqual([
      expect.objectContaining({ level: 40, msg: "export failed" }),
    ]);
  });
});
