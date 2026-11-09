import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
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

/**
 * One request for up to 1000 keys; no keys, no request. Throws when the
 * provider refuses any key: S3 and MinIO answer 200 and list them in `Errors`.
 */
export async function deleteObjects(
  bucket: string,
  keys: readonly string[]
): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  const { Errors: refused = [] } = await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
  if (refused.length > 0) {
    throw new Error(
      `Delete refused: ${refused.map(({ Code, Key }) => `${Key}: ${Code}`).join(", ")}`
    );
  }
}

/** Copies `from` to `to` within `bucket`, its type and caching kept. */
export async function copyObject(
  bucket: string,
  from: string,
  to: string
): Promise<void> {
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${from}`,
      Key: to,
    })
  );
}

/** What a bucket holds: how many objects and their bytes together. */
export type BucketTotals = { bytes: number; objects: number };

/** One stored object: its key and its bytes. */
export type ObjectSize = { bytes: number; key: string };

/**
 * The objects of `bucket` under `prefix` (all of it when `prefix` is left
 * out), one page at a time: a page is at most 1000 keys, and each needs the
 * continuation token of the one before it. Throws when the provider refuses.
 */
const listPages = (
  bucket: string,
  prefix?: string
): AsyncIterable<ObjectSize[]> => ({
  [Symbol.asyncIterator]() {
    let token: string | undefined;
    let finished = false;
    return {
      next: async () => {
        if (finished) {
          return { done: true, value: undefined };
        }
        const page = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: token,
            ...(prefix !== undefined && { Prefix: prefix }),
          })
        );
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
        finished = !token;
        return {
          done: false,
          value: (page.Contents ?? []).map(({ Key = "", Size = 0 }) => ({
            bytes: Size,
            key: Key,
          })),
        };
      },
    };
  },
});

/**
 * Every object of `bucket`, counted and summed page by page: a bucket of
 * millions of objects is never held in memory. Throws when the provider
 * refuses the listing.
 */
export async function listBucketTotals(bucket: string): Promise<BucketTotals> {
  const totals = { bytes: 0, objects: 0 };
  for await (const page of listPages(bucket)) {
    totals.objects += page.length;
    for (const { bytes } of page) {
      totals.bytes += bytes;
    }
  }
  return totals;
}

/** Every object of `bucket` whose key starts with `prefix`, with its size. Throws when the provider refuses the listing. */
export const listObjectSizes = async (
  bucket: string,
  prefix: string
): Promise<ObjectSize[]> => {
  const sizes: ObjectSize[] = [];
  for await (const page of listPages(bucket, prefix)) {
    sizes.push(...page);
  }
  return sizes;
};
