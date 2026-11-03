import { cdp, server } from "vitest/browser";

/** What a browser test tells Chromium its screen is. */
const EMULATED = {
  /** A visitor who asked for less motion (`motion-reduce:`). */
  MOTION: "prefers-reduced-motion",
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
 * Runs `test` on a touch screen, `(pointer: coarse)` matching. Chromium's
 * `setEmulatedMedia` ignores `pointer`; its touch emulation sets it.
 */
export const withCoarsePointer = <T>(test: () => Promise<T>) =>
  emulating(
    () =>
      cdp().send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: EMULATED.TOUCH_POINTS,
      }),
    () => cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false }),
    test
  );
