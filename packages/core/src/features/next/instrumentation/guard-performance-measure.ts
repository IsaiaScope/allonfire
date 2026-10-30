/** What a browser says when React's development timing measures backwards. */
const NEGATIVE_TIME_STAMP = "negative time stamp";

/**
 * Development only: turns the one `performance.measure` error React's
 * component timing throws when `notFound()` or `redirect()` interrupts a
 * render (it measures from a start it never set) into a zero-length measure,
 * so the dev overlay stops reporting it on every 404. Any other error still
 * throws. Tracked in vercel/next.js#86060, fixed upstream by React #37563;
 * delete this once a Next release carries that fix. Production never runs
 * React's component timing, so it needs nothing.
 */
export const guardPerformanceMeasure = (
  target: Pick<Performance, "measure">
) => {
  const measure = target.measure.bind(target);
  target.measure = (
    ...[name, options, end]: Parameters<Performance["measure"]>
  ) => {
    try {
      return measure(name, options, end);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(NEGATIVE_TIME_STAMP)
      ) {
        return measure(name, { duration: 0, start: 0 });
      }
      throw error;
    }
  };
};
