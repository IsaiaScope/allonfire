import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * What only the build reads; `next.config.ts` is its one importer. Kept out of
 * the runtime `env`: the Docker runner stage never sets these, so a required
 * var there would fail every server render.
 */
export const buildEnv = createEnv({
  experimental__runtimeEnv: {},
  server: {
    /** The Images' bucket; an e2e run builds against its own. */
    STORAGE_BUCKET: z.string().min(3).default(IMAGE.BUCKET.DEFAULT),
    /**
     * MinIO as this App's server reaches it, baked into the `/storage/images`
     * rewrite. No default: a production build without it must fail, not proxy
     * to localhost. Dev reads `.env.development`.
     */
    STORAGE_ENDPOINT: z.url(),
  },
});
