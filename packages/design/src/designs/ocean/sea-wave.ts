/** A wave's shape: where it sits, how high it rises, how long one wave is. */
type OceanWave = {
  amplitude: number;
  /** One wave, crest to crest. */
  period: number;
  width: number;
  /** The waterline. */
  y: number;
};

const HALF = 2;

/**
 * The sea line as one open path across `width`: a quadratic curve, then
 * smooth ones, a half period each. A caller strokes it (a divider, a page
 * header) or closes it down to fill (the share card's foot).
 */
export const oceanWavePath = ({ amplitude, period, width, y }: OceanWave) => {
  const half = period / HALF;
  const rest = Array.from(
    { length: width / half - 1 },
    (_, index) => `T${half * (index + 2)} ${y}`
  ).join("");
  return `M0 ${y}Q${half / HALF} ${y - amplitude} ${half} ${y}${rest}`;
};
