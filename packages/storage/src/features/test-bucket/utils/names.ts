import { testRunName } from "@allonfire/config/tests/run/test-run";

/**
 * The Test database's name with hyphens (S3 names allow no underscore), from
 * the same stamp, so the same characters are refused.
 */
export const testBucketName = (label: string, stamp: string) =>
  testRunName(label, stamp, "-");
