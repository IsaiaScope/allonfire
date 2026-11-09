// @module-tag unit
import { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";
import { LOG } from "../../logger/constants/logger";
import { createLogger } from "../../logger/create-logger";
import { pinoDiagLogger } from "../diag-logger";

const lineSchema = z.looseObject({ level: z.number(), msg: z.string() });

describe("pinoDiagLogger", () => {
  it("writes OpenTelemetry's own failures to the Host's log", () => {
    const written: string[] = [];
    const logger = createLogger({
      destination: { write: (chunk: string) => written.push(chunk) },
      development: false,
      level: LOG.LEVEL.DEBUG,
    });

    pinoDiagLogger(logger).warn("export failed", new Error("ECONNREFUSED"));

    expect(written.map((line) => parseJsonWith(line, lineSchema))).toEqual([
      expect.objectContaining({
        level: logger.levels.values[LOG.LEVEL.WARN],
        msg: "export failed",
      }),
    ]);
  });
});
