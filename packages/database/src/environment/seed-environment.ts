import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { env } from "./environment";

export const seedEnv = createEnv({
  extends: [env],
  runtimeEnv: process.env,
  server: {
    // Required: the real Admin, Admin in every App
    DATABASE_SEED_ADMIN_EMAIL: z.email(),
    DATABASE_SEED_ADMIN_NAME: z.string().min(1).optional(),
    DATABASE_SEED_ADMIN_PASSWORD: z.string().min(8),
  },
});

export type SeedEnv = typeof seedEnv;
