import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const seedEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(8),
    ADMIN_NAME: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
});
