import { isStaleTestRun } from "@allonfire/config/tests/run/test-run";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import {
  DeleteBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { setupImageBucket } from "../image/setup/setup-bucket";
import { s3 } from "../s3/client";
import { bucketExists } from "../s3/exists";
import { deleteObjects } from "../s3/objects";
import { testBucketName } from "./names";

/** Empties and removes `bucket`. */
async function removeBucket(bucket: string): Promise<void> {
  // ponytail: one listing; a test bucket holds the Fixtures plus what a run
  // uploads, far under ListObjectsV2's 1000 keys. Page it if that changes.
  const { Contents = [] } = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket })
  );
  await deleteObjects(
    bucket,
    Contents.flatMap(({ Key }) => (Key ? [Key] : []))
  );
  await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
}

/**
 * Drops crashed runs' buckets, never one a run still going holds. Another run
 * sweeping at the same time can drop a bucket first; MinIO then answers this
 * run `NoSuchBucket` or, mid-delete, `ClientDisconnected`, so the error itself
 * does not say: a failed removal counts only while the bucket is still there.
 */
export async function sweepTestBuckets(now = new Date()): Promise<string[]> {
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  const stale = Buckets.flatMap(({ Name }) =>
    Name && isStaleTestRun(Name, now) ? [Name] : []
  );
  await Promise.all(
    stale.map((bucket) =>
      removeBucket(bucket).catch(async (error: unknown) => {
        if (await bucketExists(bucket)) {
          throw error;
        }
      })
    )
  );
  return stale;
}

/**
 * A bucket for one run, set up as the deploy sets up `image` but holding
 * every Image Fixture, once crashed runs' buckets are swept; returns its name.
 */
export async function createTestBucket(
  label: string,
  stamp: string
): Promise<string> {
  await sweepTestBuckets();
  const bucket = testBucketName(label, stamp);
  await setupImageBucket(bucket, objectValues(FIXTURE.IMAGE));
  return bucket;
}

/** Empties and removes the run's bucket. */
export const dropTestBucket = (label: string, stamp: string) =>
  removeBucket(testBucketName(label, stamp));
