// @module-tag unit
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
import { memoryStore } from "./memory-store";

describe("which routes are rate-limited", () => {
  it("never rate-limits /health or /ready", async () => {
    const store = memoryStore();

    const app = createApp(appDeps({ store }));
    await app.request("/health");
    await app.request("/ready");

    expect(store.hits.size).toBe(0);
  });

  it("rate-limits the docs routes, unlike the probes", async () => {
    const store = memoryStore();

    await createApp(appDeps({ store })).request("/openapi.json");

    expect([...store.hits.values()]).toEqual([1]);
  });
});
