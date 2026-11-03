import { cdp, server } from "vitest/browser";

const MOTION = "prefers-reduced-motion";

/** Whether this browser can ask for less motion: only Chromium can be told
 *  to (its DevTools protocol); a test that needs it runs there alone. */
export const CAN_REDUCE_MOTION = server.browser === "chromium";

/**
 * Runs `test` as a visitor who asked for less motion does, then gives the
 * page its own setting back: the page outlives the test.
 */
export const withReducedMotion = async <T>(test: () => Promise<T>) => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: MOTION, value: "reduce" }],
  });
  try {
    return await test();
  } finally {
    await cdp().send("Emulation.setEmulatedMedia", {
      features: [{ name: MOTION, value: "" }],
    });
  }
};
