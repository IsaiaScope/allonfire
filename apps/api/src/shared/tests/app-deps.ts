import type { AppDeps } from "../../app";
import { memoryStore } from "../../features/rate-limit/tests/memory-store";

/**
 * Dependencies for `createApp` in tests that drive a feature through the whole
 * middleware chain: healthy checks and an in-memory rate-limit store.
 */
export function appDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    checkDatabase: async () => true,
    checkRedis: async () => true,
    store: memoryStore(),
    ...overrides,
  };
}
