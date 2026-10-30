import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../../s3/client";
import { bucketExists } from "../../s3/exists";

/**
 * Makes `bucket` ready for the Apps: created, only when missing, and closed:
 * no policy, so nobody reads it anonymously (an earlier deploy's read-only
 * policy is removed). Only the API writes it and the image server reads it,
 * both with the storage's keys. It uploads nothing: a deploy's pictures come
 * from uploads, a test run's Fixtures from `createTestBucket`. Safe on every
 * deploy.
 */
export async function setupImageBucket(bucket: string): Promise<void> {
  if (!(await bucketExists(bucket))) {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await s3.send(new DeleteBucketPolicyCommand({ Bucket: bucket }));
}
