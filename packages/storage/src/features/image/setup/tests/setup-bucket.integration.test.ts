// @module-tag integration

import { testRunStamp } from "@allonfire/config/tests/run/test-run";
import {
  GetBucketPolicyCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { s3 } from "../../../s3/client";
import { dropTestBucket } from "../../../test-bucket/bucket";
import { testBucketName } from "../../../test-bucket/names";
import { setupImageBucket } from "../setup-bucket";

const STAMP = testRunStamp();
const bucket = testBucketName("setup", STAMP);

const policy = async () =>
  (await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }))).Policy;

afterAll(async () => {
  await dropTestBucket("setup", STAMP);
});

describe("setting up a deploy's Image bucket", () => {
  it("creates it empty, readable by key and never listable", async () => {
    await setupImageBucket(bucket);
    const { Contents = [] } = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );
    expect(Contents).toEqual([]);
    expect(await policy()).toContain("s3:GetObject");
    expect(await policy()).not.toContain("s3:ListBucket");
  });

  it("is safe on the next deploy", async () => {
    await expect(setupImageBucket(bucket)).resolves.toBeUndefined();
    expect(await policy()).toContain("s3:GetObject");
  });
});
