import { type InstallPlatform, PWA } from "./constants/pwa";

/** In-app browsers (Instagram, Facebook, LINE) install nothing. */
const IN_APP = /Instagram|FBAN|FBAV|Line\//;
const IOS = /iPhone|iPad|iPod/;
const MAC = /Macintosh/;
/** Safari itself: Chrome's user agent says Safari too, but no `Version/`. */
const SAFARI = /Version\/[\d.]+.*Safari\//;

export type Visitor = {
  /** The browser offered its install prompt (`beforeinstallprompt`). */
  installable: boolean;
  /** `display-mode: standalone`: opened as the installed App already. */
  standalone: boolean;
  /** A touch screen (`navigator.maxTouchPoints > 1`): an iPad reports a Mac. */
  touch: boolean;
  userAgent: string;
};

/**
 * How the Install hint installs the App here, or null where nothing applies:
 * an in-app browser, the installed App itself, or a browser with no prompt
 * and no steps (Firefox; Chrome before it finds the App installable, or
 * once it is installed).
 */
export const installPlatform = ({
  installable,
  standalone,
  touch,
  userAgent,
}: Visitor): InstallPlatform | null => {
  if (standalone || IN_APP.test(userAgent)) {
    return null;
  }
  if (IOS.test(userAgent) || (MAC.test(userAgent) && touch)) {
    return PWA.PLATFORM.IOS;
  }
  if (installable) {
    return PWA.PLATFORM.INSTALLABLE;
  }
  return MAC.test(userAgent) && SAFARI.test(userAgent)
    ? PWA.PLATFORM.MAC_SAFARI
    : null;
};
