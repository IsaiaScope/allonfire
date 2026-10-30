import { z } from "zod";

/** An env flag is a string; only these two spellings are accepted. */
const BOOLEAN = { FALSE: "false", TRUE: "true" } as const;

export const booleanEnvSchema = z.enum(BOOLEAN);
export type BooleanEnv = z.infer<typeof booleanEnvSchema>;

/**
 * The values `NODE_ENV` can take, shared by every package and app. Comparing
 * against these instead of bare literals makes a typo a type error rather than
 * a branch that never fires.
 */
const NODE = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

/** Validates `NODE_ENV` in each env module: `nodeEnvSchema.default(...)`. */
export const nodeEnvSchema = z.enum(NODE);
export type NodeEnv = z.infer<typeof nodeEnvSchema>;

/** The values shared env variables can take: `ENV.BOOLEAN.*` for a flag, `ENV.NODE.*` for `NODE_ENV`. */
export const ENV = { BOOLEAN, NODE } as const;
