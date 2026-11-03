// @module-tag unit
// @vitest-environment node
// Node, not jsdom: the instrumentation runs on a Next App's server.

import { logs } from "@opentelemetry/sdk-node";
import type { Instrumentation } from "next";
import { LOG } from "../../../logger/constants/logger";
import { TELEMETRY } from "../../../telemetry/constants/telemetry";
import { onRequestError, register } from "../instrumentation";
import { startTelemetry } from "../instrumentation.node";

const sdk = vi.hoisted(() => ({ options: vi.fn(), start: vi.fn() }));
vi.mock("@opentelemetry/sdk-node", async (original) => ({
  ...(await original<typeof import("@opentelemetry/sdk-node")>()),
  NodeSDK: vi.fn(
    class {
      constructor(options: unknown) {
        sdk.options(options);
      }
      start = sdk.start;
    }
  ),
}));

const ENDPOINT = "http://collector.test/api/default";
const UNSET = {
  NODE_ENV: "production",
  TELEMETRY_HEADERS: {},
  TELEMETRY_SERVICE_NAME: TELEMETRY.DEFAULT.SERVICE_NAME,
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("register", () => {
  it("starts nothing outside the Node runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("TELEMETRY_ENDPOINT", ENDPOINT);
    await register();
    expect(sdk.start).not.toHaveBeenCalled();
  });

  it("starts the SDK on the Node runtime when an endpoint is set", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("TELEMETRY_ENDPOINT", ENDPOINT);
    // A fresh module graph, so the telemetry env reads the endpoint.
    const fresh = await import("../instrumentation");
    await fresh.register();
    expect(sdk.start).toHaveBeenCalledOnce();
  });
});

describe("startTelemetry", () => {
  it("starts nothing without an endpoint: nothing ships", () => {
    startTelemetry(UNSET);
    expect(sdk.start).not.toHaveBeenCalled();
  });

  it("starts the SDK, sending traces and log lines to the endpoint under the App's name", () => {
    startTelemetry({ ...UNSET, TELEMETRY_ENDPOINT: ENDPOINT });
    expect(sdk.start).toHaveBeenCalledOnce();
    expect(sdk.options).toHaveBeenCalledWith(
      expect.objectContaining({
        logRecordProcessors: [expect.any(logs.BatchLogRecordProcessor)],
        serviceName: TELEMETRY.DEFAULT.SERVICE_NAME,
      })
    );
  });
});

describe("onRequestError", () => {
  it("logs the error with its path and route type", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const failure = new Error("render failed");
    // Imported as onRequestError imports it, from the current module graph.
    const { serverLogger } = await import("../../logger/server-logger");
    const error = vi
      .spyOn(serverLogger(), "error")
      .mockImplementation(() => undefined);
    const request: Parameters<Instrumentation.onRequestError>[1] = {
      headers: {},
      method: "GET",
      path: "/it/users",
    };
    const context: Parameters<Instrumentation.onRequestError>[2] = {
      renderSource: "react-server-components",
      revalidateReason: undefined,
      routePath: "/[locale]/users",
      routerKind: "App Router",
      routeType: "render",
    };

    await onRequestError(failure, request, context);

    expect(error).toHaveBeenCalledWith(
      { err: failure, path: request.path, routeType: context.routeType },
      LOG.MESSAGE.REQUEST_FAILED
    );
  });
});
