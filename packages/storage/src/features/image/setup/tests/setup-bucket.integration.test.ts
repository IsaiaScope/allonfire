// @module-tag integration

import { testRunStamp } from "@allonfire/config/tests/run/test-run";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import {
  GetBucketPolicyCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../../../environment/environment";
import { storedObjectUrl } from "../../../../shared/utils/stored-object-url";
import { s3 } from "../../../s3/client";
import { putObject } from "../../../s3/objects";
import { dropTestBucket } from "../../../test-bucket/bucket";
import { testBucketName } from "../../../test-bucket/names";
import { setupImageBucket } from "../setup-bucket";

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

const hasPolicy = () =>
  s3.send(new GetBucketPolicyCommand({ Bucket: bucket })).then(
    () => true,
    () => false
  );

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
      contentType: "text/plain",
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
