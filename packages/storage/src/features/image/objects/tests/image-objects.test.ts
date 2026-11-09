// @module-tag unit
import { env } from "../../../../environment/environment";
import {
  avatarObjectSizes,
  deleteImageObjects,
  imageBucketTotals,
  putImageObject,
} from "../utils/image-objects";

const objects = vi.hoisted(() => ({
  deleteObjects: vi.fn(() => Promise.resolve()),
  listBucketTotals: vi.fn(() => Promise.resolve({ bytes: 9, objects: 2 })),
  listObjectSizes: vi.fn(() =>
    Promise.resolve([{ bytes: 3, key: "avatar-u-1" }])
  ),
  putObject: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../s3/utils/objects", () => objects);

describe("image objects", () => {
  it("stores an Image as immutable AVIF in the configured bucket", async () => {
    const body = Buffer.from("avif");
    await putImageObject("k.avif", body);
    expect(objects.putObject).toHaveBeenCalledWith(
      env.STORAGE_BUCKET,
      "k.avif",
      body,
      {
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/avif",
      }
    );
  });

  it("deletes Images from the configured bucket", async () => {
    await deleteImageObjects(["a.avif"]);
    expect(objects.deleteObjects).toHaveBeenCalledWith(env.STORAGE_BUCKET, [
      "a.avif",
    ]);
  });

  it("totals the configured bucket", async () => {
    await expect(imageBucketTotals()).resolves.toEqual({
      bytes: 9,
      objects: 2,
    });
    expect(objects.listBucketTotals).toHaveBeenCalledWith(env.STORAGE_BUCKET);
  });

  it("lists the Avatars' files, the objects under their prefix, with their sizes", async () => {
    await expect(avatarObjectSizes()).resolves.toEqual([
      { bytes: 3, key: "avatar-u-1" },
    ]);
    expect(objects.listObjectSizes).toHaveBeenCalledWith(
      env.STORAGE_BUCKET,
      "avatar-"
    );
  });
});
