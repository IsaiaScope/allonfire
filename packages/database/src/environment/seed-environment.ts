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
    // Required: Laura's guest Viewer, seeded by features/apps/laura/seed
    DATABASE_SEED_LAURA_VIEWER_EMAIL: z.email(),
    DATABASE_SEED_LAURA_VIEWER_PASSWORD: z.string().min(8),
    // "prod" (default) = the real Admin and Laura's guest Viewer; "local" =
    // also every Fixture (features/seed/fixtures).
    DATABASE_SEED_MODE: z.enum(["local", "prod"]).default("prod"),
  },
});

export type SeedEnv = typeof seedEnv;
