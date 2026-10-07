"use client";

import { lazy, Suspense } from "react";

// Downloaded only when rendered: an App turns it on in development only.
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

/**
 * Sits inside AOFQueryClientProvider. `enabled` comes from the App's env
 * (`env.NODE_ENV === NODE_ENV.DEVELOPMENT`): a package cannot read the
 * browser's NODE_ENV without `process.env`, which only the App's env wraps.
 */
export const AOFReactQueryDevtools = ({ enabled }: { enabled: boolean }) =>
  enabled ? (
    <Suspense fallback={null}>
      <ReactQueryDevtools />
    </Suspense>
  ) : null;
