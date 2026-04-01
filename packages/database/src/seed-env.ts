import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const seedEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // Required: main admin with full access
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(8),
    ADMIN_NAME: z.string().min(1).optional(),
    // Required: viewer accounts seeded alongside admin
    SOCIAL_VIEWER_EMAIL: z.email(),
    SOCIAL_VIEWER_PASSWORD: z.string().min(8),
    LAURA_VIEWER_EMAIL: z.email(),
    LAURA_VIEWER_PASSWORD: z.string().min(8),
    // "prod" (default) = admin only, "dev" = admin + test users + mock data
    SEED_MODE: z.enum(["dev", "prod"]).default("prod"),
    TEST_PASSWORD: z.string().min(8).optional(),
  },
  runtimeEnv: process.env,
});
