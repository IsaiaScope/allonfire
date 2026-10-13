/** Where an App serves every storage, under its own origin; one folder per storage. */
const BASE = "/storage";
/** Images, under `BASE` in an App and under a host's version prefix in an API. */
const IMAGES = "/images";

/** Every path the storage package owns. */
export const STORAGE = {
  PATH: {
    BASE,
    /** `/storage/images`: what `AOFStorageImage` requests and each App proxies to the bucket. */
    IMAGE_PROXY: `${BASE}${IMAGES}`,
    IMAGES,
  },
} as const;
