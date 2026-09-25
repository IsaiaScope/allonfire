import { authEnvSchema } from "@allonfire/auth/env";
import { env as dbEnv } from "@allonfire/database/environment/environment";
import { env as storageEnv } from "@allonfire/storage/environment/environment";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {},
  experimental__runtimeEnv: {},
  extends: [dbEnv, storageEnv],
  server: {
    ...authEnvSchema,
    LAURA_VIEWER_EMAIL: z.email().optional(),
    LAURA_VIEWER_PASSWORD: z.string().min(1).optional(),
  },
});
