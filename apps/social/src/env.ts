import { env as dbEnv } from "@allonfire/database/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    N8N_API_KEY: z.string().min(1).optional(),
  },
  client: {},
  extends: [dbEnv],
  experimental__runtimeEnv: {},
});
