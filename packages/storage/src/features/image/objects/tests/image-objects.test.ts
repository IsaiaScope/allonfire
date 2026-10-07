// @module-tag unit
import { deleteImageObjects, putImageObject } from "../image-objects";

const objects = vi.hoisted(() => ({
  deleteObjects: vi.fn(() => Promise.resolve()),
  putObject: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../s3/objects", () => objects);

describe("image objects", () => {
  it("stores an Image as immutable WebP in the image bucket", async () => {
    const body = Buffer.from("webp");
    await putImageObject("k.avif", body);
    expect(objects.putObject).toHaveBeenCalledWith("image", "k.avif", body, {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "image/avif",
    });
  });

  it("deletes Images from the image bucket", async () => {
    await deleteImageObjects(["a.webp"]);
    expect(objects.deleteObjects).toHaveBeenCalledWith("image", ["a.webp"]);
  });
});
