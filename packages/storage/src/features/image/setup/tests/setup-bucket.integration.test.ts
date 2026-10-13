// @module-tag integration

import { testRunStamp } from "@allonfire/config/tests/run/test-run";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../../../environment/environment";
import { storedObjectUrl } from "../../../../shared/utils/stored-object-url";
import { s3 } from "../../../s3/client";
import { dropTestBucket } from "../../../test-bucket/bucket";
import { testBucketName } from "../../../test-bucket/names";
import { IMAGE } from "../../constants/image";
import { setupImageBucket } from "../setup-bucket";

const { key } = FIXTURE.IMAGE.SIGN_IN;
const STAMP = testRunStamp();
const bucket = testBucketName("setup", STAMP);

afterAll(async () => {
  await dropTestBucket("setup", STAMP);
});

describe("setting up a deploy's Image bucket", () => {
  it("creates the bucket and serves the sign-in photo to anyone, as AVIF", async () => {
    await setupImageBucket(bucket);
    const res = await fetch(storedObjectUrl(env.STORAGE_ENDPOINT, bucket, key));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(IMAGE.FORMAT.CONTENT_TYPE);
    expect(res.headers.get("cache-control")).toBe(IMAGE.CACHE.CONTROL);
  });

  it("changes nothing on the next deploy", async () => {
    const head = () =>
      s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const before = await head();
    await setupImageBucket(bucket);
    expect((await head()).ETag).toBe(before.ETag);
    expect((await head()).LastModified).toEqual(before.LastModified);
  });
});
