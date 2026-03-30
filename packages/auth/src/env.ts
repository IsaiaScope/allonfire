import { z } from "zod";

export const authEnvSchema = {
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
};
