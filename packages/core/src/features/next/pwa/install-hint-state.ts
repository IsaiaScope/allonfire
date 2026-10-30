import { z } from "zod";
import { UNIT } from "../../../shared/constants/units";
import { storageItem } from "../../../shared/utils/storage";
import { PWA } from "./constants/pwa";

const QUIET_MS =
  PWA.INSTALL_HINT.QUIET_DAYS * UNIT.SECONDS_PER_DAY * UNIT.MS_PER_SECOND;

/** When the visitor last dismissed the hint, in ms. */
const dismissed = storageItem(
  PWA.INSTALL_HINT.STORAGE_KEY.DISMISSED,
  z.number().positive()
);
/** That the visitor has loaded an App page before. */
const seen = storageItem(PWA.INSTALL_HINT.STORAGE_KEY.SEEN, z.literal(true));

/**
 * Whether this is the visitor's first load, remembering that it happened.
 * The hint never shows on a first load (web.dev's install patterns: wait
 * until someone comes back). Where storage keeps nothing every load is a
 * first, so the hint never nags a visitor whose dismissal it would forget.
 */
export const firstLoad = () => {
  if (seen.read()) {
    return false;
  }
  seen.write(true);
  return true;
};

/** Whether the hint is due at `now`: never dismissed, or a year ago. */
const hintDue = (now: number) => {
  const at = dismissed.read();
  return at === null || now - at >= QUIET_MS;
};

/**
 * Whether this page load is the visitor's first, asked once per load: the
 * layout stays mounted across soft navigations, and React's Strict Mode runs
 * an effect twice, which must not read as a second visit.
 */
let thisLoadIsFirst: boolean | undefined;

/**
 * Whether the Install hint may show at `now`: never on the visitor's first
 * load, nor for a year after a dismissal.
 */
export const hintMayShow = (now: number) => {
  thisLoadIsFirst ??= firstLoad();
  return !thisLoadIsFirst && hintDue(now);
};

/** Keeps the hint away for a year from `at`. */
export const dismissHint = (at: number) => dismissed.write(at);
