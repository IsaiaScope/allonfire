import { testDatabaseName } from "@allonfire/database/features/test-database/utils/names";

/**
 * The Test database's name with hyphens (S3 names allow no underscore), from
 * the same stamp, so the same characters are refused.
 */
export const testBucketName = (label: string, stamp: string) =>
  testDatabaseName(label, stamp).replaceAll("_", "-");
