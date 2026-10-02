import { AllowedApp } from "@allonfire/database/enums";
import { createEnv } from "@t3-oss/env-nextjs";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { z } from "zod";

/**
 * What a Next App's server needs to reach the API's auth, read at runtime.
 * An App extends its own env with it (`extends: [nextAuthEnv]`). Separate
 * from `authEnvSchema`, which is the API's.
 *
 * Not checked while `next build` collects page data: these are runtime
 * values (the API's internal address, which App this server is) that neither
 * the Docker build nor CI's build sets. The server checks them when it loads
 * the module.
 */
export const nextAuthEnv = createEnv({
  experimental__runtimeEnv: {},
  server: {
    /**
     * Where the backend serves this module's routes, path included. The
     * module never knows the prefix its host mounts it under (the API adds
     * `/v1`), so the App is told the whole address. No default: the path is
     * the host's to say. Internal address in production, like `API_URL`.
     */
    API_AUTH_URL: z.url(),
    /**
     * The API as the App's server reaches it. In production the internal
     * address on the Docker network, not the public one through Traefik:
     * Traefik would replace the visitor's forwarded address with the App's,
     * and the API's per-IP limits would count every visitor as one.
     */
    API_URL: z.url().default("http://localhost:3300"),
    /**
     * Which App this server is. No default: an App that forgot it must fail
     * to start, not let in whoever another App lets in.
     */
    AUTH_APP: z.enum(AllowedApp).exclude([AllowedApp.ALL]),
  },
  skipValidation: process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD,
});
