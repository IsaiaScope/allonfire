import { z } from "zod";

/**
 * The values `NODE_ENV` may take, shared by every package and app. Comparing
 * against these instead of bare literals makes a typo a type error rather than
 * a branch that never fires.
 */
export const NODE_ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

/** Validates `NODE_ENV` in each env module: `nodeEnvSchema.default(...)`. */
export const nodeEnvSchema = z.enum(NODE_ENV);
export type NodeEnv = z.infer<typeof nodeEnvSchema>;
