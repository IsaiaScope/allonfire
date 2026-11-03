import { LOCAL } from "@allonfire/config/local/addresses";

/**
 * Fills each unset `STORAGE_*` variable with its Local value, for a test
 * setup: the storage env validates at import. `??=` keeps a value CI or the
 * shell set.
 */
export function fillLocalStorageEnv(): void {
  process.env.STORAGE_ENDPOINT ??= LOCAL.URL.STORAGE;
  process.env.STORAGE_ACCESS_KEY ??= LOCAL.STORAGE.ACCESS_KEY;
  process.env.STORAGE_SECRET_KEY ??= LOCAL.STORAGE.SECRET_KEY;
  process.env.STORAGE_IMAGE_SERVER_URL ??= LOCAL.URL.IMAGE_SERVER;
  process.env.STORAGE_IMAGE_SERVER_KEY ??= LOCAL.IMAGE_SERVER.KEY;
  process.env.STORAGE_IMAGE_SERVER_SALT ??= LOCAL.IMAGE_SERVER.SALT;
}
