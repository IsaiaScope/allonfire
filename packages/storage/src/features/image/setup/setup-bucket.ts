import { stringifyJson } from "@allonfire/core/shared/utils/json";
import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../../s3/client";
import { bucketExists } from "../../s3/exists";

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
 * Makes `bucket` ready for the Apps: created, only when missing, with the
 * read-only policy. It uploads nothing: a deploy's Images come from uploads,
 * a test run's Fixtures from `createTestBucket`. Safe on every deploy.
 */
export async function setupImageBucket(bucket: string): Promise<void> {
  if (!(await bucketExists(bucket))) {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: readOnlyPolicy(bucket),
    })
  );
}
