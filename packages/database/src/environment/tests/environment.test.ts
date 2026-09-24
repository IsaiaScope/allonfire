// @module-tag unit
const DATABASE_URL = "postgresql://app:secret@db:5432/allonfire";

async function loadEnv(nodeEnv: string | undefined) {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", DATABASE_URL);
  vi.stubEnv("NODE_ENV", nodeEnv);
  const { env } = await import("../environment");
  return env;
}

describe("env", () => {
  it("reads NODE_ENV", async () => {
    expect((await loadEnv("production")).NODE_ENV).toBe("production");
  });

  it("defaults NODE_ENV to development", async () => {
    expect((await loadEnv(undefined)).NODE_ENV).toBe("development");
  });

  it("rejects an unknown NODE_ENV", async () => {
    await expect(loadEnv("staging")).rejects.toThrow();
  });
});
