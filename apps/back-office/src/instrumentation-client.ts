import { guardPerformanceMeasure } from "@allonfire/core/features/next/instrumentation/guard-performance-measure";
import { ENV } from "@allonfire/core/shared/constants/env";
import { env } from "@/environment/environment";

// Runs before the App is interactive. In development only, keep React's
// component timing from throwing on every 404 (vercel/next.js#86060).
if (env.NODE_ENV === ENV.NODE.DEVELOPMENT) {
  guardPerformanceMeasure(performance);
}
