import { stubUserDeps } from "@allonfire/auth/features/users/hono/tests/stub-user-deps";
import { stubAuth } from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { stubImageDeps } from "@allonfire/storage/features/image/hono/tests/stub-image-deps";
import type { AppDeps } from "../../app";
import { stubServicesDeps } from "../../features/services/tests/stub-services-deps";
import { stubStorageUsageDeps } from "../../features/storage-usage/tests/stub-storage-usage-deps";
import { stubUserUsageDeps } from "../../features/user-usage/tests/stub-user-usage-deps";
import { API } from "../constants/api";
import { memoryStore } from "./memory-store";

/** A path no route matches, for a request that ends in the 404 problem document. */
export const UNMATCHED_PATH = `${API.PATH.VERSION}/nothing-here`;

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
    services: stubServicesDeps(),
    storageUsage: stubStorageUsageDeps(),
    store: memoryStore(),
    users: stubUserDeps(),
    userUsage: stubUserUsageDeps(),
    ...overrides,
  };
}
