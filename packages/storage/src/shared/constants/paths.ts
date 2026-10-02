/** Where an App serves every storage, under its own origin; one folder per storage. */
export const STORAGE_PATH = "/storage";

/** Images, under `STORAGE_PATH`. */
export const IMAGE_PATH = "/images";

/** `/storage/images`: what `AOFStorageImage` requests and each App rewrites to the bucket. */
export const IMAGE_BASE_PATH = `${STORAGE_PATH}${IMAGE_PATH}` as const;
