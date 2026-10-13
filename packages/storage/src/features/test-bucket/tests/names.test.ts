// @module-tag unit
import { testBucketName } from "../names";

const S3_BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

it("names a bucket S3 accepts", () => {
  const name = testBucketName("back-office", "1760011200_ab12cd");
  expect(name).toBe("allonfire-test-back-office-1760011200-ab12cd");
  expect(name).toMatch(S3_BUCKET_NAME);
});

it("refuses a label S3 would refuse", () => {
  expect(() => testBucketName("api.v1", "1760011200_ab12cd")).toThrow();
});
