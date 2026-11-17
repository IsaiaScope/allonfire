"use client";

import { useEffect } from "react";
import { PWA } from "../constants/pwa";
import { reloadOnResume } from "../utils/reload-on-resume";

const dropWorkers = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((entry) => entry.unregister()));
};

/**
 * Keeps `next dev` live on any device (a phone, a desktop tab, an installed App): a page that comes back after
 * `PWA.DEV_RESUME.HIDDEN_MS` hidden reloads (its HMR socket is frozen and
 * Next does not notice), and a service worker a production build left on this
 * address is dropped, since it would serve stale files. Mount it in every
 * build but production (`AOFPwa` does). Renders nothing.
 */
export const AOFDevResume = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      dropWorkers().catch((error: unknown) => reportError(error));
    }
    return reloadOnResume({
      hiddenMs: PWA.DEV_RESUME.HIDDEN_MS,
      now: () => Date.now(),
      page: document,
      reload: () => location.reload(),
    });
  }, []);
  return null;
};
