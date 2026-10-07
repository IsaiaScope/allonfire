import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./client";

/** What a stored object is served with. */
export type PutObjectOptions = {
  contentType: string;
  cacheControl?: string;
};

/** Stores `body` at `key` in `bucket`, replacing any object already there. */
export async function putObject(
  bucket: string,
  key: string,
  body: Buffer,
  { contentType, cacheControl }: PutObjectOptions
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      CacheControl: cacheControl,
      ContentType: contentType,
      Key: key,
    })
  );
}

/** One request for up to 1000 keys; no keys, no request. */
export async function deleteObjects(
  bucket: string,
  keys: readonly string[]
): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}
