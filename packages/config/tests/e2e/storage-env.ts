import { LOCAL } from "../../local/addresses";

/**
 * The storage settings of an e2e run, for every process that opens the Image
 * module's settings: the API, and the CLI that drops the run's bucket after.
 * The Local image server signs nothing itself: the API signs the links it
 * serves with the same throwaway key and salt.
 */
export const E2E_STORAGE_ENV = {
  STORAGE_ENDPOINT: LOCAL.URL.STORAGE,
  STORAGE_IMAGE_SERVER_KEY: LOCAL.IMAGE_SERVER.KEY,
  STORAGE_IMAGE_SERVER_SALT: LOCAL.IMAGE_SERVER.SALT,
  STORAGE_IMAGE_SERVER_URL: LOCAL.URL.IMAGE_SERVER,
} as const;
