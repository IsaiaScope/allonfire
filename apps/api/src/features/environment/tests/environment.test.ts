import { describe, expect, it } from "vitest";
import { parseEnv } from "../environment";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379/0",
  CORS_ORIGINS: "http://localhost:3200",
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
});
