import { HTTP } from "@allonfire/core/features/http/constants/http";
import { HeadBucketCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { s3 } from "./client";

/** Whether `bucket` is there: a 404 says no, any other failure is thrown. */
export async function bucketExists(bucket: string): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === HTTP.STATUS.NOT_FOUND
    ) {
      return false;
    }
    throw error;
  }
}
