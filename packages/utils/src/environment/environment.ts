import { createEnv } from "@t3-oss/env-core";
import { NODE_ENV, nodeEnvSchema } from "../constants/node-env";

/**
 * Variables every package and app reads. `NODE_ENV` defaults to development,
 * as Node treats it when unset.
 *
 * Build an env from process.env with `extends: [env]`. Where an env is built
 * from a record passed in (apps/api's `parseEnv`, for testability), spread
 * `runtimeEnvSchema` into `server` instead: an extended env reads
 * process.env, not the record.
 */
export const runtimeEnvSchema = {
  NODE_ENV: nodeEnvSchema.default(NODE_ENV.DEVELOPMENT),
};

export const env = createEnv({
  runtimeEnv: process.env,
  server: runtimeEnvSchema,
});
