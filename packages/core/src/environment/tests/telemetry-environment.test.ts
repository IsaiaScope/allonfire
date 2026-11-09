// @module-tag unit
import { z } from "zod";
import { TELEMETRY } from "../../features/telemetry/constants/telemetry";
import { telemetryEnvSchema } from "../telemetry-environment";

const telemetrySchema = z.object(telemetryEnvSchema);

describe("telemetryEnvSchema", () => {
  it("accepts both keys unset: no endpoint, no headers", () => {
    expect(telemetrySchema.parse({})).toEqual({ TELEMETRY_HEADERS: {} });
  });

  it("drops the endpoint's trailing slashes", () => {
    expect(
      telemetrySchema.parse({
        TELEMETRY_ENDPOINT: "http://collector.test/api/default//",
      }).TELEMETRY_ENDPOINT
    ).toBe("http://collector.test/api/default");
  });

  it("refuses an endpoint that is not HTTP", () => {
    expect(
      telemetrySchema.safeParse({ TELEMETRY_ENDPOINT: "grpc://collector.test" })
        .success
    ).toBe(false);
  });

  it("parses the headers into decoded pairs, split at the first =", () => {
    expect(
      telemetrySchema.parse({
        TELEMETRY_HEADERS: "Authorization=Basic%20YWI6Y2Q=,x-team=api",
      }).TELEMETRY_HEADERS
    ).toEqual({ Authorization: "Basic YWI6Y2Q=", "x-team": "api" });
  });

  it("reports a malformed percent-escape as an issue, not a throw", () => {
    const result = telemetrySchema.safeParse({
      TELEMETRY_HEADERS: "Authorization=Basic%E0",
    });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      TELEMETRY.ERROR.HEADERS_MALFORMED_ESCAPE,
    ]);
  });
});

describe("telemetryEnv", () => {
  const ENDPOINT = "http://collector.test/api/default";

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("TELEMETRY_ENDPOINT", undefined);
    vi.stubEnv("TELEMETRY_HEADERS", undefined);
    vi.stubEnv("TELEMETRY_SERVICE_NAME", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts every TELEMETRY_* unset: nothing ships, under the default name", async () => {
    const { telemetryEnv } = await import("../telemetry-environment");

    expect(telemetryEnv.TELEMETRY_ENDPOINT).toBeUndefined();
    expect(telemetryEnv.TELEMETRY_HEADERS).toEqual({});
    expect(telemetryEnv.TELEMETRY_SERVICE_NAME).toBe(
      TELEMETRY.DEFAULT.SERVICE_NAME
    );
  });

  it("reads an empty value as unset", async () => {
    vi.stubEnv("TELEMETRY_ENDPOINT", "");
    vi.stubEnv("TELEMETRY_HEADERS", "");
    const { telemetryEnv } = await import("../telemetry-environment");

    expect(telemetryEnv.TELEMETRY_ENDPOINT).toBeUndefined();
    expect(telemetryEnv.TELEMETRY_HEADERS).toEqual({});
  });

  it("parses the endpoint and headers as the API does, and keeps a given name", async () => {
    vi.stubEnv("TELEMETRY_ENDPOINT", `${ENDPOINT}/`);
    vi.stubEnv("TELEMETRY_HEADERS", "Authorization=Basic%20YWI6Y2Q=");
    vi.stubEnv("TELEMETRY_SERVICE_NAME", "allonfire-test");
    const { telemetryEnv } = await import("../telemetry-environment");

    expect(telemetryEnv.TELEMETRY_ENDPOINT).toBe(ENDPOINT);
    expect(telemetryEnv.TELEMETRY_HEADERS).toEqual({
      Authorization: "Basic YWI6Y2Q=",
    });
    expect(telemetryEnv.TELEMETRY_SERVICE_NAME).toBe("allonfire-test");
  });

  it("refuses to load with malformed headers", async () => {
    vi.stubEnv("TELEMETRY_HEADERS", "no-equals-sign");

    await expect(import("../telemetry-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });
});
