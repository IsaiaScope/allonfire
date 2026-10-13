import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  HeadBucketCommand,
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { s3 } from "./client";

/** Whether `head` finds it: a 404 says no, any other failure is thrown. */
async function exists(head: () => Promise<unknown>): Promise<boolean> {
  try {
    await head();
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

/** Whether `bucket` is there. */
export const bucketExists = (bucket: string) =>
  exists(() => s3.send(new HeadBucketCommand({ Bucket: bucket })));

/** Whether `bucket` holds an object at `key`. */
export const objectExists = (bucket: string, key: string) =>
  exists(() => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })));
