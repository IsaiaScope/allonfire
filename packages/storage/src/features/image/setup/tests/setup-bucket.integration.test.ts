// @module-tag integration

import { testRunStamp } from "@allonfire/config/tests/run/test-run";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import {
  GetBucketPolicyCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { env } from "../../../../environment/environment";
import { storedObjectUrl } from "../../../../shared/tests/stored-object-url";
import { s3 } from "../../../s3/utils/client";
import { putObject } from "../../../s3/utils/objects";
import { dropTestBucket } from "../../../test-bucket/utils/bucket";
import { testBucketName } from "../../../test-bucket/utils/names";
import { setupImageBucket } from "../utils/setup-bucket";

const STAMP = testRunStamp();
const bucket = testBucketName("setup", STAMP);
const KEY = "closed.txt";

/** The read-only policy an earlier deploy set: anyone reads a key. */
const OLD_POLICY = stringifyJson({
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

const anonymousGet = async () =>
  (await fetch(storedObjectUrl(env.STORAGE_ENDPOINT, bucket, KEY))).status;

/** The error S3 and MinIO answer for a bucket with no policy. */
const NO_POLICY = "NoSuchBucketPolicy";

/**
 * Whether the bucket has a policy. Only `NO_POLICY` says no: any other
 * failure (a refused call, a wrong bucket) is thrown, so it never reads as
 * "closed".
 */
const hasPolicy = async () => {
  try {
    await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === NO_POLICY) {
      return false;
    }
    throw error;
  }
};

afterAll(async () => {
  await dropTestBucket("setup", STAMP);
});

describe("setting up a deploy's Image bucket", () => {
  it("creates it empty and closed: an anonymous GET of an object answers 403", async () => {
    await setupImageBucket(bucket);
    const { Contents = [] } = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );
    expect(Contents).toEqual([]);
    await putObject(bucket, KEY, Buffer.from("x"), {
      contentType: HTTP.CONTENT_TYPE.TEXT,
    });
    expect(await anonymousGet()).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await hasPolicy()).toBe(false);
  });

  it("a bucket left with an old read-only policy loses it", async () => {
    await s3.send(
      new PutBucketPolicyCommand({ Bucket: bucket, Policy: OLD_POLICY })
    );
    await setupImageBucket(bucket);
    expect(await hasPolicy()).toBe(false);
    expect(await anonymousGet()).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("is safe on the next deploy", async () => {
    await expect(setupImageBucket(bucket)).resolves.toBeUndefined();
    expect(await hasPolicy()).toBe(false);
  });
});
