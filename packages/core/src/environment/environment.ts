import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { ENV, nodeEnvSchema } from "../shared/constants/env";

/**
 * Variables every package and app reads. `ENV.NODE` defaults to development,
 * as Node treats it when unset.
 *
 * Build an env from process.env with `extends: [env]`. Where an env is built
 * from a record passed in (apps/api's `parseEnv`, for testability), spread
 * `runtimeEnvSchema` into `server` instead: an extended env reads
 * process.env, not the record.
 */
export const runtimeEnvSchema = {
  NODE_ENV: nodeEnvSchema.default(ENV.NODE.DEVELOPMENT),
};

export const env = createEnv({
  runtimeEnv: process.env,
  server: {
    ...runtimeEnvSchema,
    /**
     * Set only by config's e2e stack for the App build it tests: exposes
     * Next's testing API (`instant()`) in that production build. Never set
     * for the image that serves traffic.
     */
    CONFIG_E2E_TESTING_API: z.stringbool().default(false),
  },
});
