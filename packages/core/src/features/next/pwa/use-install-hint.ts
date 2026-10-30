"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { type InstallStatus, type InstallStep, PWA } from "./constants/pwa";
import { dismissHint, hintMayShow } from "./install-hint-state";
import { installPlatform, type Visitor } from "./install-platform";
import { installPrompt, subscribeInstallPrompt } from "./install-prompt";

const STANDALONE = "(display-mode: standalone)";
/** More than one touch point: a touch screen, so an iPad reporting a Mac. */
const TOUCH_POINTS = 1;
const { INSTALL_STATUS } = PWA.INSTALL_HINT;

/**
 * The Install button, where the browser offers its own dialog: `onInstall`
 * opens it; `installing` once accepted, until the browser reports the App
 * installed (then the hint is gone); `failed` when the dialog failed, the
 * button ready to try again. Refusing the dialog counts as a dismissal.
 */
export type InstallButton = {
  failed: boolean;
  installing: boolean;
  onInstall: () => Promise<void>;
};

type Dismissible = { dismiss: () => void };

/**
 * What the Install hint shows: the Install button, or else the platform's
 * steps, in order; either way `dismiss` keeps it away for a year.
 */
export type InstallHint =
  | (Dismissible & { install: InstallButton })
  | (Dismissible & { steps: readonly InstallStep[] });

/**
 * The Install hint, or null: on the server, before mount, on a first visit,
 * where nothing applies or for a year after a dismissal. Deciding after
 * mount keeps the server's HTML and the first client render the same.
 */
export const useInstallHint = (): InstallHint | null => {
  const [visitor, setVisitor] = useState<Omit<Visitor, "installable"> | null>(
    null
  );
  const [status, setStatus] = useState<InstallStatus>(INSTALL_STATUS.IDLE);
  const prompt = useSyncExternalStore(
    subscribeInstallPrompt,
    installPrompt,
    () => null
  );
  useEffect(() => {
    if (!hintMayShow(Date.now())) {
      return;
    }
    setVisitor({
      standalone: matchMedia(STANDALONE).matches,
      touch: navigator.maxTouchPoints > TOUCH_POINTS,
      userAgent: navigator.userAgent,
    });
  }, []);
  const platform = visitor
    ? installPlatform({ ...visitor, installable: prompt !== null })
    : null;
  const dismiss = () => {
    dismissHint(Date.now());
    setVisitor(null);
  };
  const install = async () => {
    if (!prompt) {
      return;
    }
    setStatus(INSTALL_STATUS.INSTALLING);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "dismissed") {
        setStatus(INSTALL_STATUS.IDLE);
        dismiss();
      }
    } catch {
      setStatus(INSTALL_STATUS.ERROR);
    }
  };
  if (!platform) {
    return null;
  }
  if (platform === PWA.PLATFORM.INSTALLABLE) {
    return {
      dismiss,
      install: {
        failed: status === INSTALL_STATUS.ERROR,
        installing: status === INSTALL_STATUS.INSTALLING,
        onInstall: install,
      },
    };
  }
  return { dismiss, steps: PWA.INSTALL_HINT.STEPS[platform] };
};
