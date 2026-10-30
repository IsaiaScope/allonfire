// @module-tag unit
import { captureLog } from "../../logger/tests/capture";
import { pinoDiagLogger } from "../telemetry";

describe("pinoDiagLogger", () => {
  it("writes OpenTelemetry's own failures to the API log", () => {
    const { lines, logger } = captureLog();

    pinoDiagLogger(logger).warn("export failed", new Error("ECONNREFUSED"));

    expect(lines).toEqual([
      expect.objectContaining({ level: 40, msg: "export failed" }),
    ]);
  });
});
