// @module-tag unit
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { z } from "zod";
import { ENV } from "../../../../shared/constants/env";
import { parseJsonWith } from "../../../../shared/utils/json";
import { LOG } from "../../../logger/constants/logger";
import { TELEMETRY } from "../../../telemetry/constants/telemetry";
import {
  buildServerLogger,
  serverLogger,
  serverLoggerOptions,
} from "../server-logger";

const ENDPOINT = "http://collector.test/api/default";
const HEADERS = { Authorization: "Basic YWI6Y2Q=" };
const TARGET = {
  endpoint: ENDPOINT,
  headers: HEADERS,
  serviceName: TELEMETRY.DEFAULT.SERVICE_NAME,
};
const UNSET = {
  NODE_ENV: ENV.NODE.PRODUCTION,
  TELEMETRY_HEADERS: {},
  TELEMETRY_SERVICE_NAME: TELEMETRY.DEFAULT.SERVICE_NAME,
};

const lineSchema = z.looseObject({ msg: z.string(), path: z.string() });

/** A capture stream, and the lines written to it. */
const capture = () => {
  const written: string[] = [];
  return {
    destination: { write: (chunk: string) => written.push(chunk) },
    written,
  };
};

describe("serverLoggerOptions", () => {
  it("carries no OTLP target without TELEMETRY_ENDPOINT: nothing ships", () => {
    expect(serverLoggerOptions(UNSET)).not.toHaveProperty("otlp");
  });

  it("carries the OTLP target, under the App's service name, when TELEMETRY_ENDPOINT is set", () => {
    expect(
      serverLoggerOptions({
        ...UNSET,
        TELEMETRY_ENDPOINT: ENDPOINT,
        TELEMETRY_HEADERS: HEADERS,
      }).otlp
    ).toEqual(TARGET);
  });

  it("logs at info, and nothing in tests", () => {
    expect(serverLoggerOptions(UNSET).level).toBe(LOG.LEVEL.INFO);
    expect(
      serverLoggerOptions({ ...UNSET, NODE_ENV: ENV.NODE.TEST }).level
    ).toBe(LOG.LEVEL.SILENT);
  });
});

describe("serverLogger", () => {
  it("is one logger for the whole server", () => {
    expect(serverLogger()).toBe(serverLogger());
  });

  it("writes every line to a destination it is handed", () => {
    const { destination, written } = capture();
    const logger = serverLogger({ destination });
    logger.level = LOG.LEVEL.INFO;

    logger.error({ path: "/users" }, "request failed");

    expect(parseJsonWith(written.join(""), lineSchema)).toMatchObject({
      msg: "request failed",
      path: "/users",
    });
    expect(logger).not.toBe(serverLogger());
  });
});

describe("buildServerLogger", () => {
  const exporter = new InMemoryLogRecordExporter();

  beforeEach(() => {
    logs.setGlobalLoggerProvider(
      new LoggerProvider({
        processors: [new SimpleLogRecordProcessor({ exporter })],
      })
    );
  });

  afterEach(() => {
    logs.disable();
    exporter.reset();
  });

  it("a logged line reaches the OpenTelemetry logs API with its level, message and fields", () => {
    const { destination, written } = capture();
    const logger = buildServerLogger({
      destination,
      level: LOG.LEVEL.INFO,
      otlp: TARGET,
    });

    logger.warn({ path: "/users", user: { id: "u-1" } }, "slow answer");

    const [record] = exporter.getFinishedLogRecords();
    expect(record).toMatchObject({
      attributes: { path: "/users", user: { id: "u-1" } },
      body: "slow answer",
      instrumentationScope: { name: TELEMETRY.DEFAULT.SERVICE_NAME },
      severityNumber: SeverityNumber.WARN,
      severityText: "WARN",
    });
    // The console still gets the line.
    expect(parseJsonWith(written.join(""), lineSchema)).toMatchObject({
      msg: "slow answer",
    });
  });

  it("without a target nothing is emitted", () => {
    const { destination, written } = capture();
    const logger = buildServerLogger({ destination, level: LOG.LEVEL.INFO });

    logger.error({ path: "/users" }, "request failed");

    expect(exporter.getFinishedLogRecords()).toEqual([]);
    expect(written).toHaveLength(1);
  });
});
