import { authEnvSchema } from "@allonfire/auth/env";
import { env as dbEnv } from "@allonfire/database/env";
import { env as storageEnv } from "@allonfire/storage/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    ...authEnvSchema,
    LAURA_VIEWER_EMAIL: z.email().optional(),
    LAURA_VIEWER_PASSWORD: z.string().min(1).optional(),
  },
  client: {},
  extends: [dbEnv, storageEnv],
  experimental__runtimeEnv: {},
});
