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
    /**
     * MinIO as this App's server reaches it, baked into the `/storage/images`
     * rewrite. No default: a production build without it must fail, not proxy
     * to localhost. Dev reads `.env.development`.
     */
    STORAGE_ENDPOINT: z.url(),
  },
});
