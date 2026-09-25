import { z } from "zod";

export const SEPARATOR = {
  /** Comma-delimited header values and comma-delimited env lists. */
  LIST: ",",
  /** Splits `key=value` in a key/value env list such as OTLP headers. */
  PAIR: "=",
  /** Joins a zod issue path into `a.b.c`. */
  PATH: ".",
} as const;

export const separatorSchema = z.enum(SEPARATOR);
export type Separator = z.infer<typeof separatorSchema>;
