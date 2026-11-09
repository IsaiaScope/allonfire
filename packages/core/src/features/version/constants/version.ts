import { z } from "zod";

/** A resource's Version (`versionOf`): how it is made. */
export const VERSION = {
  /** The digest `versionOf` takes. */
  HASH: "sha256",
  /** Between two parts; no part holds it. */
  PART_SEPARATOR: "\u0000",
} as const;

/** The `version` a save sends: the one its form was opened with. */
export const versionSchema = z.string().min(1);
