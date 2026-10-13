// @module-tag unit
import { storedObjectUrl } from "../stored-object-url";

describe("storedObjectUrl", () => {
  it("addresses an object path-style: origin, bucket, key", () => {
    expect(storedObjectUrl("http://minio:9000", "image", "a.avif")).toBe(
      "http://minio:9000/image/a.avif"
    );
  });

  it("drops the origin's trailing slashes, so no `//bucket`", () => {
    expect(storedObjectUrl("http://minio:9000//", "image", "a.avif")).toBe(
      "http://minio:9000/image/a.avif"
    );
  });
});
