import { PATTERN } from "@allonfire/core/shared/constants/patterns";

/**
 * Where the provider at `origin` serves `key` from `bucket`: path-style, the
 * way the S3 client is set up. Reads no environment, so a Next config can
 * import it at build.
 */
export const storedObjectUrl = (origin: string, bucket: string, key: string) =>
  `${origin.replace(PATTERN.TRAILING_SLASHES, "")}/${bucket}/${key}`;
