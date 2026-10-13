import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
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
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {},
  server: {
    /**
     * Where the backend serves this module's routes, path included. The
     * module never knows the prefix its host mounts it under (the API adds
     * `/v1`), so the App is told the whole address. No default: the path is
     * the host's to say. In production the internal address on the Docker
     * network, not the public one through Traefik: Traefik would replace the
     * visitor's forwarded address with the App's, and the API's per-IP limits
     * would count every visitor as one.
     */
    API_AUTH_URL: z.url(),
    /**
     * Which App this server is. No default: an App that forgot it must fail
     * to start, not let in whoever another App lets in.
     */
    AUTH_APP: appSchema,
    /**
     * The parent domain the API sets the Session cookies for, the API's own
     * `AUTH_COOKIE_DOMAIN`. Sign out needs it when the API does not answer: a
     * browser drops a cookie only when told the Domain it was set with.
     * None: the cookies belong to the App's own domain.
     */
    AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  },
  skipValidation: process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD,
});
