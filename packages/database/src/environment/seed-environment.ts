import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { env } from "./environment";

export const seedEnv = createEnv({
  extends: [env],
  runtimeEnv: process.env,
  server: {
    // Required: main admin with full access
    DATABASE_SEED_ADMIN_EMAIL: z.email(),
    DATABASE_SEED_ADMIN_NAME: z.string().min(1).optional(),
    DATABASE_SEED_ADMIN_PASSWORD: z.string().min(8),
    // Required: Laura viewer account seeded alongside admin
    DATABASE_SEED_LAURA_VIEWER_EMAIL: z.email(),
    DATABASE_SEED_LAURA_VIEWER_PASSWORD: z.string().min(8),
    // "prod" (default) = admin only, "dev" = admin + test users + mock data
    DATABASE_SEED_MODE: z.enum(["dev", "prod"]).default("prod"),
    DATABASE_SEED_TEST_PASSWORD: z.string().min(8).optional(),
  },
});
