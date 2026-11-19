import { nextAuthEnv } from "@allonfire/auth/environment/next-environment";
import { runtimeEnvSchema } from "@allonfire/core/environment/environment";
import { nextApiEnvSchema } from "@allonfire/core/environment/next-api-environment";
import { telemetryEnv } from "@allonfire/core/environment/telemetry-environment";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // The API's public addresses (`NEXT_PUBLIC_API_URL`, and the remote one
  // Local sets): core's schema; the runtime mappings below stay here, where
  // Next inlines them.
  client: { ...nextApiEnvSchema.client },
  // An empty value reads as unset, so an empty address is refused where one
  // is needed and means no remote address where it is optional.
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_REMOTE_URL: process.env.NEXT_PUBLIC_API_REMOTE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  // The server's telemetry (`TELEMETRY_*`, all optional): core's
  // `serverLogger` and `instrumentation.node.ts` read it.
  extends: [nextAuthEnv, telemetryEnv],
  server: {
    // The API's internal address: core's schema.
    ...nextApiEnvSchema.server,
    /**
     * The Back Office's own public address: metadataBase for every absolute
     * URL in its head (link-preview images, og:url). Read at build
     * (prerendered pages bake it in) and at runtime (home renders per
     * request), so both must carry the same value.
     */
    BACK_OFFICE_URL: z.url(),
    /**
     * Laura's public address, for the App switcher, which lists Laura for
     * every Admin who enters it. Build and runtime must carry the same value.
     */
    LAURA_URL: z.url(),
  },
  shared: runtimeEnvSchema,
});
