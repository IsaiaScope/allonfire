import { env } from "../../../environment/environment";
import { deleteObjects, putObject } from "../../s3/objects";
import { IMAGE } from "../constants/image";

/** An Image's file, in the Images' bucket unless told another (a Fixture's run bucket). */
export const putImageObject = (
  key: string,
  body: Buffer,
  bucket = env.STORAGE_BUCKET
): Promise<void> =>
  putObject(bucket, key, body, {
    cacheControl: IMAGE.CACHE.CONTROL,
    contentType: IMAGE.FORMAT.CONTENT_TYPE,
  });

/** The API sends at most 100 keys; one request takes 1000. */
export const deleteImageObjects = (keys: readonly string[]): Promise<void> =>
  deleteObjects(env.STORAGE_BUCKET, keys);
