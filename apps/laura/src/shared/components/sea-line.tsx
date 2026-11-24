import { oceanWavePath } from "@allonfire/design/designs/ocean/sea-wave";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";

const WAVE = { amplitude: 14, period: 120, width: 1200, y: 24 } as const;
const BAND = WAVE.y * 2;

/**
 * The sea line: one wave across the width, stroked in the text colour (set
 * its tone with `text-*`). Decoration, laid behind a page.
 */
export const SeaLine = (props: ComponentPropsWithoutChildren<"svg">) => (
  <svg
    aria-hidden
    fill="none"
    preserveAspectRatio="none"
    viewBox={`0 0 ${WAVE.width} ${BAND}`}
    {...props}
  >
    <path
      d={oceanWavePath(WAVE)}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
