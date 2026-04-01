import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type StorageEnv = {
  MINIO_ENDPOINT: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
};

let _env: StorageEnv | null = null;

function getEnv(): StorageEnv {
  if (!_env) {
    _env = createEnv({
      server: {
        MINIO_ENDPOINT: z.string().min(1),
        MINIO_ACCESS_KEY: z.string().min(1),
        MINIO_SECRET_KEY: z.string().min(1),
        MINIO_BUCKET: z.string().min(1),
      },
      runtimeEnv: process.env,
    }) as unknown as StorageEnv;
  }
  return _env;
}

export const env: StorageEnv = new Proxy({} as StorageEnv, {
  get(_, prop: string) {
    return getEnv()[prop as keyof StorageEnv];
  },
});
