import { authEnvSchema } from "@allonfire/auth/env";
import { env as dbEnv } from "@allonfire/database/env";
import { env as storageEnv } from "@allonfire/storage/env";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  server: {
    ...authEnvSchema,
  },
  client: {},
  extends: [dbEnv, storageEnv],
  experimental__runtimeEnv: {},
});
