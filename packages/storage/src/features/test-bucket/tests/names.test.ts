// @module-tag unit
import { testBucketName } from "../utils/names";

const S3_BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

it("names a bucket S3 accepts", () => {
  const name = testBucketName("back-office", "261009_120000_p12345_ab12cd");
  expect(name).toBe("aof-test-back-office-261009-120000-p12345-ab12cd");
  expect(name).toMatch(S3_BUCKET_NAME);
});

it("refuses a label S3 would refuse", () => {
  expect(() =>
    testBucketName("api.v1", "261009_120000_p12345_ab12cd")
  ).toThrow();
});
