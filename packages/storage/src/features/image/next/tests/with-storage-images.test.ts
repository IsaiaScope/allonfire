// @module-tag unit
import { withStorageImages } from "../with-storage-images";

const ORIGIN = { origin: "http://minio:9000" };
const IMAGE_REWRITE = {
  destination: "http://minio:9000/image/:key",
  source: "/storage/images/:key",
};

describe("withStorageImages", () => {
  it("proxies one key under /storage and lets next/image optimize only that", async () => {
    const config = withStorageImages({}, ORIGIN);
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
    expect(config.images).toEqual({
      formats: ["image/avif", "image/webp"],
      localPatterns: [{ pathname: "/storage/images/**", search: "" }],
      minimumCacheTTL: 31_536_000,
    });
  });

  it("keeps the App's own rewrites after the Image one", async () => {
    const own = { destination: "/b", source: "/a" };
    const config = withStorageImages({ rewrites: async () => [own] }, ORIGIN);
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE, own]);
  });

  it("puts the Image rewrite first in an App's afterFiles", async () => {
    const own = { destination: "/b", source: "/a" };
    const config = withStorageImages(
      {
        rewrites: async () => ({
          afterFiles: [own],
          beforeFiles: [],
          fallback: [],
        }),
      },
      ORIGIN
    );
    expect(await config.rewrites?.()).toEqual({
      afterFiles: [IMAGE_REWRITE, own],
      beforeFiles: [],
      fallback: [],
    });
  });

  it("ignores trailing slashes on the origin", async () => {
    const config = withStorageImages({}, { origin: "http://minio:9000//" });
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
  });

  it("keeps the App's own config and image settings", () => {
    const config = withStorageImages(
      { images: { qualities: [60, 75] }, typedRoutes: false },
      ORIGIN
    );
    expect(config.typedRoutes).toBe(false);
    expect(config.images?.qualities).toEqual([60, 75]);
  });

  it("keeps the storage path when the App allows local images of its own", () => {
    const own = { pathname: "/brand/**" };
    const config = withStorageImages(
      { images: { localPatterns: [own] } },
      ORIGIN
    );
    expect(config.images?.localPatterns).toEqual([
      { pathname: "/storage/images/**", search: "" },
      own,
    ]);
  });
});
