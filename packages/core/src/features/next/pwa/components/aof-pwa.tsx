import type { ReactNode } from "react";
import { AOFServiceWorker } from "./aof-service-worker";

export type AOFPwaProps = {
  /** The App's offline banner, drawn in its Design (reads `useOffline`). */
  banner: ReactNode;
  children: ReactNode;
  /** Registers the service worker: the App's production build only. */
  enabled: boolean;
  /** The App's Install hint, drawn in its Design (reads `useInstallHint`). */
  hint: ReactNode;
};

/**
 * Every App's PWA around its pages (ADR 0023): the page, the App's own
 * Install hint and offline banner, and the service worker. The look is the
 * App's; what decides when each shows is core's (`useInstallHint`, Next's
 * `useOffline`).
 */
export const AOFPwa = ({ banner, children, enabled, hint }: AOFPwaProps) => (
  <>
    {children}
    {hint}
    {banner}
    <AOFServiceWorker enabled={enabled} />
  </>
);
