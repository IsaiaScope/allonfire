import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../../s3/client";
import { bucketExists, objectExists } from "../../s3/exists";
import { type FixtureFile, putFixtureImage } from "../fixtures/upload-fixtures";

/**
 * Images an App shows by key before anyone has uploaded anything: they ship
 * with the code, so every bucket holds them.
 */
const SHIPPED_IMAGES = [FIXTURE.IMAGE.SIGN_IN];

/** Anyone reads a key, nobody lists: never `mc anonymous set download`. */
const readOnlyPolicy = (bucket: string) =>
  stringifyJson({
    Statement: [
      {
        Action: ["s3:GetObject"],
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
    Version: "2012-10-17",
  });

/**
 * Makes `bucket` ready for the Apps: created with the read-only policy, and
 * holding `images` (every shipped Image unless told otherwise; a test run's
 * bucket asks for every Fixture) as AVIF under their keys. Safe on every
 * deploy: a bucket or key already there is left as it is.
 */
export async function setupImageBucket(
  bucket: string,
  images: readonly FixtureFile[] = SHIPPED_IMAGES
): Promise<void> {
  if (!(await bucketExists(bucket))) {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: readOnlyPolicy(bucket),
    })
  );
  await Promise.all(
    images.map(async (image) => {
      if (!(await objectExists(bucket, image.key))) {
        await putFixtureImage(bucket, image);
      }
    })
  );
}
