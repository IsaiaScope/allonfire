// @module-tag unit
import { parseEnv } from "../environment";

const valid = {
  CORS_ORIGINS: "http://localhost:3200",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379/0",
};

describe("parseEnv", () => {
  it("applies defaults for optional values", () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(3300);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(env.ENABLE_DOCS).toBe(false);
  });

  it("splits CORS_ORIGINS into a trimmed array", () => {
    const env = parseEnv({
      ...valid,
      CORS_ORIGINS: "http://a.test, http://b.test",
    });
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("coerces numeric values", () => {
    const env = parseEnv({ ...valid, PORT: "4000" });
    expect(env.PORT).toBe(4000);
  });

  it("rejects a missing REDIS_URL", () => {
    const { REDIS_URL, ...withoutRedis } = valid;
    expect(() => parseEnv(withoutRedis)).toThrow();
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => parseEnv({ ...valid, PORT: "banana" })).toThrow();
  });

  it("leaves telemetry off unless an OTLP endpoint is set", () => {
    const env = parseEnv(valid);
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(env.OTEL_EXPORTER_OTLP_HEADERS).toEqual({});
    expect(env.OTEL_SERVICE_NAME).toBe("allonfire-api");
  });

  it("reports a malformed percent-escape in OTEL_EXPORTER_OTLP_HEADERS as an env error", () => {
    expect(() =>
      parseEnv({
        ...valid,
        OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic%E0",
      })
    ).toThrow("Invalid environment variables");
  });

  it("parses OTEL_EXPORTER_OTLP_HEADERS into decoded header pairs", () => {
    const env = parseEnv({
      ...valid,
      OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic%20YWI6Y2Q=,x-team=api",
    });
    expect(env.OTEL_EXPORTER_OTLP_HEADERS).toEqual({
      Authorization: "Basic YWI6Y2Q=",
      "x-team": "api",
    });
  });

  it.each(["not a url", "localhost:5080/api/default"])(
    "rejects the OTLP endpoint %s",
    (endpoint) => {
      expect(() =>
        parseEnv({ ...valid, OTEL_EXPORTER_OTLP_ENDPOINT: endpoint })
      ).toThrow();
    }
  );

  it("rejects a header entry with no value", () => {
    expect(() =>
      parseEnv({ ...valid, OTEL_EXPORTER_OTLP_HEADERS: "Authorization" })
    ).toThrow();
  });
});
