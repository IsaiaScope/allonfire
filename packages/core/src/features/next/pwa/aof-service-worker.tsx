"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";
import { PWA } from "./constants/pwa";

/**
 * Registers the App's service worker (`PWA.PATH.SERVICE_WORKER`, built by
 * `pwa:build`). The layout passes `enabled` for a production build only: a
 * worker under `next dev` caches HMR files. A new build's worker takes over
 * on the next visit. Renders nothing.
 */
export const AOFServiceWorker = ({ enabled }: { enabled: boolean }) => {
  useEffect(() => {
    if (enabled && "serviceWorker" in navigator) {
      // ponytail: a failed registration only means no offline page this
      // visit; the next visit tries again.
      new Workbox(PWA.PATH.SERVICE_WORKER).register().catch(() => undefined);
    }
  }, [enabled]);
  return null;
};
