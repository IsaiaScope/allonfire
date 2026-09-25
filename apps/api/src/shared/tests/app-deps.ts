import { stubAuth } from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import type { AppDeps } from "../../app";
import { memoryStore } from "../../features/rate-limit/tests/memory-store";
import { AUTH_BASE_PATH } from "../constants/routes";

/** The module's stub, mounted where the API mounts the real one. */
export const apiAuth = (overrides: Partial<AuthLike> = {}): AuthLike =>
  stubAuth({ basePath: AUTH_BASE_PATH, ...overrides });

/**
 * Dependencies for `createApp` in tests that drive a feature through the whole
 * middleware chain: healthy checks, an in-memory rate-limit store and an
 * anonymous stub auth.
 */
export function appDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    auth: apiAuth(),
    checkDatabase: async () => true,
    checkRedis: async () => true,
    store: memoryStore(),
    ...overrides,
  };
}
