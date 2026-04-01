import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type DatabaseEnv = { DATABASE_URL: string };

let _env: DatabaseEnv | null = null;

function getEnv(): DatabaseEnv {
  if (!_env) {
    _env = createEnv({
      server: { DATABASE_URL: z.url() },
      runtimeEnv: process.env,
    }) as unknown as DatabaseEnv;
  }
  return _env;
}

export const env: DatabaseEnv = new Proxy({} as DatabaseEnv, {
  get(_, prop: string) {
    return getEnv()[prop as keyof DatabaseEnv];
  },
});
