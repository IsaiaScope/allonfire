import { stubAuth } from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { stubImageDeps } from "@allonfire/storage/features/image/hono/tests/stub-image-deps";
import type { AppDeps } from "../../app";
import { memoryStore } from "../../features/rate-limit/tests/memory-store";
import { API } from "../constants/api";

/** The module's stub, mounted where the API mounts the real one. */
export const apiAuth = (overrides: Partial<AuthLike> = {}): AuthLike =>
  stubAuth({ basePath: API.PATH.AUTH, ...overrides });

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
    images: stubImageDeps(),
    store: memoryStore(),
    users: {
      canListUsers: () => false,
      canManageUsers: () => Promise.resolve(false),
      createUser: () =>
        Promise.reject(new Error("createUser must not be called")),
      deleteUsers: () =>
        Promise.reject(new Error("deleteUsers must not be called")),
      listUsers: () =>
        Promise.reject(new Error("listUsers must not be called")),
    },
    ...overrides,
  };
}
