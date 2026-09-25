import { env as runtimeEnv } from "@allonfire/utils/environment/environment";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * The variables this package needs. Build an env from process.env with
 * `extends: [env]`; spread `databaseEnvSchema` into `server` where the env is
 * built from a record passed in (apps/api's `parseEnv`).
 */
export const databaseEnvSchema = {
  DATABASE_URL: z.url(),
};

export const env = createEnv({
  extends: [runtimeEnv],
  runtimeEnv: process.env,
  server: databaseEnvSchema,
});
