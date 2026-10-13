import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { IMAGE } from "../features/image/constants/image";

/**
 * The variables this package needs. Spread `storageEnvSchema` into `server`
 * where the env is built from a record passed in (apps/api's `parseEnv`).
 */
export const storageEnvSchema = {
  STORAGE_ACCESS_KEY: z.string().min(1),
  /** The Images' bucket; a test run names its own. */
  STORAGE_BUCKET: z.string().min(3).default(IMAGE.BUCKET.DEFAULT),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_SECRET_KEY: z.string().min(1),
};

export const env = createEnv({
  runtimeEnv: process.env,
  server: storageEnvSchema,
});
