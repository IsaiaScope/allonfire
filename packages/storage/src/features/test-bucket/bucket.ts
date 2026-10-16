import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isStaleTestRun,
  isTestRunOf,
} from "@allonfire/config/tests/run/test-run";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import {
  DeleteBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { IMAGE_FIXTURE_FILES } from "../image/fixtures/constants/files";
import { putImageObject } from "../image/objects/image-objects";
import { prepareImage } from "../image/prepare/prepare-image";
import { setupImageBucket } from "../image/setup/setup-bucket";
import { s3 } from "../s3/client";
import { bucketExists } from "../s3/exists";
import { deleteObjects } from "../s3/objects";
import { testBucketName } from "./names";

/** One Image Fixture's file into `bucket`, through the real pipeline, under its key. */
async function putImageFixture(
  bucket: string,
  { key, source }: { key: string; source: string }
): Promise<void> {
  const { buffer } = await prepareImage(
    readFileSync(resolve(IMAGE_FIXTURE_FILES, source))
  );
  await putImageObject(key, buffer, bucket);
}

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
 * Removes the buckets `isLeftover` names; returns them. Another run removing
 * at the same time can drop a bucket first; MinIO then answers this run
 * `NoSuchBucket` or, mid-delete, `ClientDisconnected`, so the error itself
 * does not say: a failed removal counts only while the bucket is still there.
 */
async function removeLeftovers(
  isLeftover: (bucket: string) => boolean
): Promise<string[]> {
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  const leftovers = Buckets.flatMap(({ Name }) =>
    Name && isLeftover(Name) ? [Name] : []
  );
  await Promise.all(
    leftovers.map((bucket) =>
      removeBucket(bucket).catch(async (error: unknown) => {
        if (await bucketExists(bucket)) {
          throw error;
        }
      })
    )
  );
  return leftovers;
}

/** Drops crashed runs' buckets, never one a run still going holds. */
export const sweepTestBuckets = (now = new Date()) =>
  removeLeftovers((bucket) => isStaleTestRun(bucket, now));

/**
 * Drops every run of `label`, whatever its age: only for a label one run at a
 * time holds (see `dropTestDatabasesOf`).
 */
export const dropTestBucketsOf = (label: string) =>
  removeLeftovers((bucket) => isTestRunOf(bucket, label));

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
  await setupImageBucket(bucket);
  await Promise.all(
    objectValues(FIXTURE.IMAGE).map((image) => putImageFixture(bucket, image))
  );
  return bucket;
}

/** Empties and removes the run's bucket. */
export const dropTestBucket = (label: string, stamp: string) =>
  removeBucket(testBucketName(label, stamp));
