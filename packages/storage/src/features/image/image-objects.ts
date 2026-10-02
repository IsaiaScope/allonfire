import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../s3/client";
import { IMAGE_BUCKET, IMAGE_CACHE_TTL_SECONDS } from "./constants/bucket";

/** Every Image is stored as WebP (see `prepareImage`). */
const IMAGE_CONTENT_TYPE = "image/webp";

export async function putImageObject(key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Body: body,
      Bucket: IMAGE_BUCKET,
      CacheControl: `public, max-age=${IMAGE_CACHE_TTL_SECONDS}, immutable`,
      ContentType: IMAGE_CONTENT_TYPE,
      Key: key,
    })
  );
}

/** One request for up to 1000 keys; the API sends at most 100. */
export async function deleteImageObjects(
  keys: readonly string[]
): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: IMAGE_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}
