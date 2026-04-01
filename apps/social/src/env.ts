import { authEnvSchema } from "@allonfire/auth/env";
import { env as dbEnv } from "@allonfire/database/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

type SocialEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DATABASE_URL: string;
  N8N_API_KEY?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SOCIAL_VIEWER_EMAIL?: string;
  SOCIAL_VIEWER_PASSWORD?: string;
};

let _env: SocialEnv | null = null;

function getEnv(): SocialEnv {
  if (!_env) {
    _env = createEnv({
      server: {
        ...authEnvSchema,
        N8N_API_KEY: z.string().min(1).optional(),
        TWITTER_CLIENT_ID: z.string().min(1).optional(),
        TWITTER_CLIENT_SECRET: z.string().min(1).optional(),
        LINKEDIN_CLIENT_ID: z.string().min(1).optional(),
        LINKEDIN_CLIENT_SECRET: z.string().min(1).optional(),
        GOOGLE_CLIENT_ID: z.string().min(1).optional(),
        GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
        SOCIAL_VIEWER_EMAIL: z.email().optional(),
        SOCIAL_VIEWER_PASSWORD: z.string().min(1).optional(),
      },
      client: {},
      extends: [dbEnv],
      experimental__runtimeEnv: {},
    }) as unknown as SocialEnv;
  }
  return _env;
}

export const env: SocialEnv = new Proxy({} as SocialEnv, {
  get(_, prop: string) {
    return getEnv()[prop as keyof SocialEnv];
  },
});
