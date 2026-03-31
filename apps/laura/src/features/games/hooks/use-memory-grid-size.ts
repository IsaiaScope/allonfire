import { useEffect, useRef, useState } from "react";

const SM_BREAKPOINT = 640;
const MOBILE = { cols: 3, rows: 4, gap: 6 } as const;
const TABLET = { cols: 4, rows: 3, gap: 12 } as const;

type GridSize = {
  cols: number;
  rows: number;
  gap: number;
  cardSize: number;
  ready: boolean;
};

export function useMemoryGridSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>({
    ...MOBILE,
    cardSize: 0,
    ready: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    let prevCardSize = 0;
    let prevCols = 0;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      const layout = width >= SM_BREAKPOINT ? TABLET : MOBILE;
      const maxByWidth = (width - (layout.cols - 1) * layout.gap) / layout.cols;
      const maxByHeight =
        (height - (layout.rows - 1) * layout.gap) / layout.rows;
      const cardSize = Math.max(
        Math.floor(Math.min(maxByWidth, maxByHeight)),
        0
      );
      if (cardSize === prevCardSize && layout.cols === prevCols) {
        return;
      }
      prevCardSize = cardSize;
      prevCols = layout.cols;
      setGridSize({ ...layout, cardSize, ready: true });
    };

    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, gridSize };
}
