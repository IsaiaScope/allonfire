import { nextAuthEnv } from "@allonfire/auth/environment/next-environment";
import { runtimeEnvSchema } from "@allonfire/core/environment/environment";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    /**
     * The API's public address, for the browser: it calls the API directly,
     * with the Session cookies set for the parent domain. Baked in at build.
     */
    NEXT_PUBLIC_API_URL: z.url(),
  },
  // An empty value reads as unset, so `LAURA_URL=` hides Laura.
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  extends: [nextAuthEnv],
  server: {
    /**
     * The API as this App's server reaches it, for a page that reads data
     * before it renders: the internal Docker address in production
     * (`http://api:3000`), so the call never leaves the host. The browser
     * keeps NEXT_PUBLIC_API_URL.
     */
    API_URL: z.url(),
    /**
     * The Back Office's own public address: metadataBase for every absolute
     * URL in its head (link-preview images, og:url). Read at build
     * (prerendered pages bake it in) and at runtime (home renders per
     * request), so both must carry the same value.
     */
    BACK_OFFICE_URL: z.url(),
    /**
     * Laura's public address, for the App switcher. Unset (or empty), Laura
     * is not listed: it is not deployed yet.
     */
    LAURA_URL: z.url().optional(),
  },
  shared: runtimeEnvSchema,
});
