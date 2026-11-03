// @module-tag unit

import { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";
import { TELEMETRY } from "../../telemetry/constants/telemetry";
import type { OtlpTarget } from "../../telemetry/otlp";
import { LOG } from "../constants/logger";
import { createLogger, loggerTargets } from "../create-logger";

const SECRET = "hunter2";

const TARGET: OtlpTarget = {
  endpoint: "http://collector.test/api/default",
  headers: { authorization: "Basic YWI6Y2Q=" },
  serviceName: "allonfire-test",
};

const lineSchema = z.looseObject({
  body: z.looseObject({ password: z.string() }),
  msg: z.string(),
});

const targetNames = (targets: ReturnType<typeof loggerTargets>) =>
  targets.map((target) => target.target);

describe("createLogger", () => {
  it("writes JSON with the redacted paths censored to the stream it is handed", () => {
    const written: string[] = [];
    const logger = createLogger({
      destination: { write: (chunk: string) => written.push(chunk) },
      development: false,
      level: LOG.LEVEL.INFO,
    });

    logger.info({ body: { password: SECRET } }, "sign-in");

    expect(written).toHaveLength(1);
    expect(written.join("")).not.toContain(SECRET);
    expect(parseJsonWith(written.join(""), lineSchema)).toMatchObject({
      body: { password: LOG.REDACT.CENSOR },
      msg: "sign-in",
    });
  });
});

describe("loggerTargets", () => {
  it("adds the OTLP transport only when a target is given", () => {
    const without = loggerTargets({
      development: false,
      level: LOG.LEVEL.INFO,
    });
    const withTarget = loggerTargets({
      development: false,
      level: LOG.LEVEL.INFO,
      otlp: TARGET,
      serviceVersion: "1.2.3",
    });

    expect(targetNames(without)).not.toContain(LOG.TRANSPORT.OTLP);
    expect(targetNames(withTarget)).toEqual([
      LOG.TRANSPORT.STDOUT,
      LOG.TRANSPORT.OTLP,
    ]);
    expect(withTarget[1]).toMatchObject({
      level: LOG.LEVEL.INFO,
      options: {
        logRecordProcessorOptions: {
          exporterOptions: {
            protobufExporterOptions: {
              headers: TARGET.headers,
              url: `${TARGET.endpoint}${TELEMETRY.PATH.LOGS}`,
            },
          },
        },
        resourceAttributes: {
          [TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_NAME]: TARGET.serviceName,
        },
        serviceVersion: "1.2.3",
      },
    });
  });

  it("prints pretty lines in development and plain JSON elsewhere", () => {
    expect(
      targetNames(loggerTargets({ development: true, level: LOG.LEVEL.INFO }))
    ).toEqual([LOG.TRANSPORT.PRETTY]);
    expect(
      loggerTargets({ development: false, level: LOG.LEVEL.INFO })
    ).toEqual([]);
    expect(
      targetNames(
        loggerTargets({
          development: true,
          level: LOG.LEVEL.INFO,
          otlp: TARGET,
        })
      )
    ).toEqual([LOG.TRANSPORT.PRETTY, LOG.TRANSPORT.OTLP]);
  });

  it("filters every target at the logger's level", () => {
    const targets = loggerTargets({
      development: true,
      level: LOG.LEVEL.WARN,
      otlp: TARGET,
    });

    expect(targets.map((target) => target.level)).toEqual([
      LOG.LEVEL.WARN,
      LOG.LEVEL.WARN,
    ]);
  });
});
