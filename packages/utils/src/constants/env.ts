import { z } from "zod";

/** An env flag is a string; only these two spellings are accepted. */
export const BOOLEAN_ENV = { FALSE: "false", TRUE: "true" } as const;

export const booleanEnvSchema = z.enum(BOOLEAN_ENV);
export type BooleanEnv = z.infer<typeof booleanEnvSchema>;
