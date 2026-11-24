import { z } from "zod";

/**
 * What a Next App needs to reach the API, as schema fragments an App spreads
 * into its own `createEnv` (`client: { ...nextApiEnvSchema.client }`, `server:
 * { ...nextApiEnvSchema.server }`), the way `telemetryEnvSchema` is. Fragments,
 * not an env to extend: Next inlines a `NEXT_PUBLIC_*` variable only where the
 * App's own code reads `process.env.NEXT_PUBLIC_*` literally, so the App
 * keeps its `experimental__runtimeEnv` mappings.
 */
export const nextApiEnvSchema = {
  client: {
    /**
     * Local only: the API's address for a page opened off this machine (the
     * tailnet address, from a phone), where `NEXT_PUBLIC_API_URL` is not
     * reachable. Unset, the browser always calls `NEXT_PUBLIC_API_URL`.
     * Baked in at build.
     */
    NEXT_PUBLIC_API_REMOTE_URL: z.url().optional(),
    /**
     * The API's public address, for the browser: it calls the API directly,
     * with the Session cookies set for the parent domain. Baked in at build.
     */
    NEXT_PUBLIC_API_URL: z.url(),
  },
  server: {
    /**
     * The API as this App's server reaches it, for a page that reads data
     * before it renders: the internal Docker address in production
     * (`http://api:3000`), so the call never leaves the host. The browser
     * keeps NEXT_PUBLIC_API_URL.
     */
    API_URL: z.url(),
  },
} as const;
