import { STORAGE_PATH } from "../../../shared/constants/paths";

/** Images, under `STORAGE_PATH` in an App and under a host's version prefix in an API. */
export const IMAGE_PATH = "/images";

/** `/storage/images`: what `AOFStorageImage` requests and each App proxies to the bucket. */
export const IMAGE_PROXY_PATH = `${STORAGE_PATH}${IMAGE_PATH}` as const;
