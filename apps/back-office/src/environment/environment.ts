import { nextAuthEnv } from "@allonfire/auth/environment/next-environment";
import { runtimeEnvSchema } from "@allonfire/utils/environment/environment";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    /**
     * The API's public address, for the browser: it calls the API directly,
     * with the Session cookies set for the parent domain. Baked in at build.
     */
    NEXT_PUBLIC_API_URL: z.url().default("http://localhost:3300"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  extends: [nextAuthEnv],
  shared: runtimeEnvSchema,
});
