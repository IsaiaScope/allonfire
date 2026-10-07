import { z } from "zod";

/** An env flag is a string; only these two spellings are accepted. */
export const BOOLEAN_ENV = { FALSE: "false", TRUE: "true" } as const;

export const booleanEnvSchema = z.enum(BOOLEAN_ENV);
export type BooleanEnv = z.infer<typeof booleanEnvSchema>;

/**
 * The values `NODE_ENV` can take, shared by every package and app. Comparing
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
