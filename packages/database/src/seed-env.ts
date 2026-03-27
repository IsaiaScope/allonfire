import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const seedEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // Required: main admin with full access
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(8),
    ADMIN_NAME: z.string().min(1).optional(),
    // Optional: seed test users for development
    SEED_TEST_USERS: z
      .string()
      .transform((v) => v === "true")
      .default("false"),
    TEST_PASSWORD: z.string().min(8).optional(),
  },
  runtimeEnv: process.env,
});
