import {
  type ColorScheme,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";
import { colorSchemeMedia } from "@allonfire/core/features/metadata/utils/color-scheme-media";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { cdp, page, server } from "vitest/browser";

/** What a browser test tells Chromium its screen is. */
const EMULATED = {
  /** A visitor who asked for less motion (`motion-reduce:`). */
  MOTION: "prefers-reduced-motion",
  /** The device's light or dark theme. */
  SCHEME: "prefers-color-scheme",
  /** A touch screen's fingers: its pointer is coarse (`pointer-coarse:`). */
  TOUCH_POINTS: 5,
} as const;

/** Whether this browser can be told what its screen is: only Chromium can
 *  (its DevTools protocol); a test that needs it runs there alone. */
export const CAN_EMULATE_MEDIA = server.browser === "chromium";

/**
 * Runs `test` between `start` and `stop`, which gives the page its own
 * setting back: the page outlives the test.
 */
const emulating = async <T>(
  start: () => Promise<unknown>,
  stop: () => Promise<unknown>,
  test: () => Promise<T>
): Promise<T> => {
  await start();
  try {
    return await test();
  } finally {
    await stop();
  }
};

const reducedMotion = (value: "" | "reduce") =>
  cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: EMULATED.MOTION, value }],
  });

/** Runs `test` as a visitor who asked for less motion does. */
export const withReducedMotion = <T>(test: () => Promise<T>) =>
  emulating(
    () => reducedMotion("reduce"),
    () => reducedMotion(""),
    test
  );

/**
 * Gives the device the theme `value` ("" is the browser's own, light) and
 * waits until the page has told its listeners: one added before this call
 * has run by then. `value` must change the theme, or no one is told.
 */
const deviceScheme = async (value: "" | ColorScheme) => {
  const told = new Promise((resolve) => {
    matchMedia(colorSchemeMedia(METADATA.COLOR_SCHEME.DARK)).addEventListener(
      "change",
      resolve,
      { once: true }
    );
  });
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: EMULATED.SCHEME, value }],
  });
  await told;
};

/** Runs `test` while the device, light until then, is switched to dark. */
export const withDarkDevice = <T>(test: () => Promise<T>) =>
  emulating(
    () => deviceScheme(METADATA.COLOR_SCHEME.DARK),
    () => deviceScheme(""),
    test
  );

/**
 * Waits until the page itself reports a coarse pointer (or no longer does):
 * the protocol answers before the page applies the change, and a test that
 * reads a size straight after it would read the old one on a busy machine.
 */
const pointerIsCoarse = (coarse: boolean) =>
  vi.waitFor(() => {
    if (matchMedia("(pointer: coarse)").matches !== coarse) {
      throw new Error(
        `the page's pointer is not yet ${coarse ? "coarse" : "fine"}`
      );
    }
  });

/**
 * Runs `test` on a touch screen, `(pointer: coarse)` matching. Chromium's
 * `setEmulatedMedia` ignores `pointer`; its touch emulation sets it.
 */
export const withCoarsePointer = <T>(test: () => Promise<T>) =>
  emulating(
    async () => {
      await cdp().send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: EMULATED.TOUCH_POINTS,
      });
      await pointerIsCoarse(true);
    },
    async () => {
      await cdp().send("Emulation.setTouchEmulationEnabled", {
        enabled: false,
      });
      await pointerIsCoarse(false);
    },
    test
  );

/** What a phone's safe area holds on each side, in px. */
type Insets = Record<"bottom" | "left" | "right" | "top", number>;

/** Gives the page `insets` for its safe area (`env(safe-area-inset-*)`). */
export const setSafeAreaInsets = (insets: Partial<Insets>) =>
  cdp().send("Emulation.setSafeAreaInsetsOverride", { insets });

/**
 * A phone turned sideways with `insets` (the sensor housing, the home
 * indicator): a `beforeEach` of a notch test, undone by `clearSafeAreaInsets`.
 */
export const notchedPhone = async (insets: Insets) => {
  await page.viewport(
    SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
    SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
  );
  await setSafeAreaInsets(insets);
};

/** Gives the page no safe area again: the `afterEach` of a notch test. */
export const clearSafeAreaInsets = () => setSafeAreaInsets({});
