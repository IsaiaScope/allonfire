import { deleteObjects, putObject } from "../../s3/objects";
import { IMAGE_BUCKET, IMAGE_CACHE_TTL_SECONDS } from "../constants/bucket";
import { IMAGE_FORMAT } from "../constants/format";

/** A key never changes content (a new upload gets a new key), so it is immutable. */
const IMAGE_CACHE_CONTROL = `public, max-age=${IMAGE_CACHE_TTL_SECONDS}, immutable`;

export const putImageObject = (key: string, body: Buffer): Promise<void> =>
  putObject(IMAGE_BUCKET, key, body, {
    cacheControl: IMAGE_CACHE_CONTROL,
    contentType: IMAGE_FORMAT.CONTENT_TYPE,
  });

/** The API sends at most 100 keys; one request takes 1000. */
export const deleteImageObjects = (keys: readonly string[]): Promise<void> =>
  deleteObjects(IMAGE_BUCKET, keys);
