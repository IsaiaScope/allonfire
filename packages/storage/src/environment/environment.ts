import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { IMAGE } from "../features/image/constants/image";

/** imgproxy's key and salt: hex, an even number of digits. */
const HEX = /^(?:[0-9a-f]{2})+$/i;

/**
 * The variables this package needs. Spread `storageEnvSchema` into `server`
 * where the env is built from a record passed in (apps/api's `parseEnv`).
 */
export const storageEnvSchema = {
  STORAGE_ACCESS_KEY: z.string().min(1),
  /** The Images' bucket; a test run names its own. */
  STORAGE_BUCKET: z.string().min(3).default(IMAGE.BUCKET.DEFAULT),
  STORAGE_ENDPOINT: z.url(),
  /** The image server's signing key and salt, hex (imgproxy's `IMGPROXY_KEY`, `IMGPROXY_SALT`). */
  STORAGE_IMAGE_SERVER_KEY: z.string().regex(HEX),
  STORAGE_IMAGE_SERVER_SALT: z.string().regex(HEX),
  /** Where browsers reach the image server: every stored picture's link starts here. */
  STORAGE_IMAGE_SERVER_URL: z.url(),
  STORAGE_SECRET_KEY: z.string().min(1),
};

export const env = createEnv({
  runtimeEnv: process.env,
  server: storageEnvSchema,
});
