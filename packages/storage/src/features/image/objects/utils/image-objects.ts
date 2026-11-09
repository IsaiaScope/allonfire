import { env } from "../../../../environment/environment";
import { AVATAR } from "../../../avatar/constants/avatar";
import {
  type BucketTotals,
  copyObject,
  deleteObjects,
  listBucketTotals,
  listObjectSizes,
  type ObjectSize,
  putObject,
} from "../../../s3/utils/objects";
import { IMAGE } from "../../constants/image";

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

/** A copy of an Image's file under a new name, in the Images' bucket. */
export const copyImageObject = (from: string, to: string): Promise<void> =>
  copyObject(env.STORAGE_BUCKET, from, to);

/** How many objects the Images' bucket holds and their bytes: Images, their Avatars, everything in it. */
export const imageBucketTotals = (): Promise<BucketTotals> =>
  listBucketTotals(env.STORAGE_BUCKET);

/** The Avatars' files in the Images' bucket, each with its size: what its listing holds under the Avatar prefix. */
export const avatarObjectSizes = (): Promise<ObjectSize[]> =>
  listObjectSizes(env.STORAGE_BUCKET, AVATAR.KEY_PREFIX);
