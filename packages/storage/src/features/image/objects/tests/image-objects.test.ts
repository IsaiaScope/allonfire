// @module-tag unit
import { env } from "../../../../environment/environment";
import { deleteImageObjects, putImageObject } from "../image-objects";

const objects = vi.hoisted(() => ({
  deleteObjects: vi.fn(() => Promise.resolve()),
  putObject: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../s3/objects", () => objects);

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
});
