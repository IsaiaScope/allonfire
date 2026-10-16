import { z } from "zod";
import { UNIT } from "../../../../shared/constants/units";

/** Where an App serves the PWA's files. */
const PATH = {
  /** The Offline page, under each language: `/en/offline`, `/it/offline`. */
  OFFLINE: "/offline",
  /** The service worker, generated into the App's `public/` at build. */
  SERVICE_WORKER: "/sw.js",
} as const;

/**
 * How the Install hint installs the App (ADR 0025): with the browser's own
 * prompt behind an Install button where it offers one (Chrome, Edge,
 * Android: `beforeinstallprompt`), or as steps where it does not.
 */
const PLATFORM = {
  /** The browser offered its install prompt: an Install button. */
  INSTALLABLE: "installable",
  IOS: "ios",
  MAC_SAFARI: "mac-safari",
} as const;

/** One step of the Install hint, its text `Common.Install.step.<step>`. */
const STEP = {
  IOS_ADD: "ios-add",
  IOS_SHARE: "ios-share",
  MAC_ADD_TO_DOCK: "mac-add-to-dock",
} as const;

/** Where the Install button's install is. */
const INSTALL_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  /** Accepted in the browser's prompt, until it reports the App installed. */
  INSTALLING: "installing",
} as const;

/** What every App's PWA shares: its paths, the worker's file, the Install hint. */
export const PWA = {
  INSTALL_HINT: {
    INSTALL_STATUS,
    /**
     * Days the Install hint stays away once dismissed: a year, since Safari
     * cannot tell the App is already installed and would ask again.
     */
    QUIET_DAYS: UNIT.DAYS_PER_YEAR,
    STEP,
    /** Each platform's steps, in order, where it offers no Install button. */
    STEPS: {
      [PLATFORM.IOS]: [STEP.IOS_SHARE, STEP.IOS_ADD],
      [PLATFORM.MAC_SAFARI]: [STEP.MAC_ADD_TO_DOCK],
    },
    /** `localStorage` keys: the dismissal's time in ms, and a first visit seen. */
    STORAGE_KEY: {
      DISMISSED: "aof:install-hint-dismissed",
      SEEN: "aof:install-hint-seen",
    },
  },
  /** The worker's file, relative to the App's folder. */
  OUTPUT: `public${PATH.SERVICE_WORKER}`,
  PATH,
  PLATFORM,
  /** Toast ids: one toast each, updated in place as its state changes. */
  TOAST: {
    INSTALL_HINT: "aof-install-hint",
    OFFLINE: "aof-offline",
  },
} as const;

export const installPlatformSchema = z.enum(PLATFORM);
export type InstallPlatform = z.infer<typeof installPlatformSchema>;
export const installStepSchema = z.enum(STEP);
export type InstallStep = z.infer<typeof installStepSchema>;
export const installStatusSchema = z.enum(INSTALL_STATUS);
export type InstallStatus = z.infer<typeof installStatusSchema>;
