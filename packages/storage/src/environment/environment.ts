import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  runtimeEnv: process.env,
  server: {
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_BUCKET: z.string().min(1),
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
  },
});
