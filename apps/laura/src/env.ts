import { authEnvSchema } from "@allonfire/auth/env";
import { env as dbEnv } from "@allonfire/database/env";
import { env as storageEnv } from "@allonfire/storage/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

type LauraEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DATABASE_URL: string;
  MINIO_ENDPOINT: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  LAURA_VIEWER_EMAIL?: string;
  LAURA_VIEWER_PASSWORD?: string;
};

let _env: LauraEnv | null = null;

function getEnv(): LauraEnv {
  if (!_env) {
    _env = createEnv({
      server: {
        ...authEnvSchema,
        LAURA_VIEWER_EMAIL: z.email().optional(),
        LAURA_VIEWER_PASSWORD: z.string().min(1).optional(),
      },
      client: {},
      extends: [dbEnv, storageEnv],
      experimental__runtimeEnv: {},
    }) as unknown as LauraEnv;
  }
  return _env;
}

export const env: LauraEnv = new Proxy({} as LauraEnv, {
  get(_, prop: string) {
    return getEnv()[prop as keyof LauraEnv];
  },
});
