"use client";

import { Skeleton } from "@allonfire/ui/components/skeleton";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// Heights per column — ensures all columns start at the same position
const SKELETON_COLUMNS = [
  { id: "col-a", heights: [220, 300, 190, 250, 230] },
  { id: "col-b", heights: [240, 200, 310, 280, 260] },
  { id: "col-c", heights: [280, 230, 260, 220, 270] },
  { id: "col-d", heights: [210, 290, 250, 240, 195] },
];

const COLUMN_IDS = ["col-0", "col-1", "col-2", "col-3"] as const;

export function MasonrySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
      {SKELETON_COLUMNS.map(({ id, heights }, colIndex) => (
        <div
          className={`flex flex-col gap-1.5 ${colIndex >= 2 ? "hidden sm:flex" : ""} ${colIndex >= 3 ? "sm:hidden lg:flex" : ""}`}
          key={id}
        >
          {heights.map((height) => (
            <Skeleton
              className="w-full rounded-md"
              key={`${id}-${height}`}
              style={{ height }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const BREAKPOINTS = [
  { query: "(min-width: 1024px)", columns: 4 },
  { query: "(min-width: 640px)", columns: 3 },
] as const;

const DEFAULT_COLUMNS = 2;

function measureColumns(): number {
  for (const bp of BREAKPOINTS) {
    if (window.matchMedia(bp.query).matches) {
      return bp.columns;
    }
  }
  return DEFAULT_COLUMNS;
}

function useColumnCount(): number | null {
  const [columns, setColumns] = useState<number | null>(null);

  useEffect(() => {
    setColumns(measureColumns());

    const matchers = BREAKPOINTS.map((bp) => window.matchMedia(bp.query));
    const handler = () => setColumns(measureColumns());

    for (const matcher of matchers) {
      matcher.addEventListener("change", handler);
    }
    return () => {
      for (const matcher of matchers) {
        matcher.removeEventListener("change", handler);
      }
    };
  }, []);

  return columns;
}

type MasonryGridProps<T> = {
  items: T[];
  getItemHeight: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
};

export function MasonryGrid<T>({
  items,
  getItemHeight,
  renderItem,
  keyExtractor,
}: MasonryGridProps<T>) {
  const columnCount = useColumnCount();

  const distributeItems = useCallback(
    (count: number) => {
      const cols: T[][] = Array.from({ length: count }, () => []);
      const heights = new Array<number>(count).fill(0);

      for (const item of items) {
        let shortest = 0;
        for (let i = 1; i < count; i++) {
          if ((heights[i] ?? 0) < (heights[shortest] ?? 0)) {
            shortest = i;
          }
        }
        cols[shortest]?.push(item);
        heights[shortest] = (heights[shortest] ?? 0) + getItemHeight(item);
      }

      return cols;
    },
    [items, getItemHeight]
  );

  const columns = useMemo(
    () => (columnCount ? distributeItems(columnCount) : []),
    [columnCount, distributeItems]
  );

  // Before mount: render skeleton placeholders (avoids CSS columns → JS masonry mismatch)
  if (!columnCount) {
    return <MasonrySkeleton />;
  }

  // After mount: render with JS masonry (no reflow on append)
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
      {columns.map((column, colIndex) => (
        <div className="flex flex-col gap-1.5" key={COLUMN_IDS[colIndex]}>
          {column.map((item) => (
            <div key={keyExtractor(item)}>{renderItem(item)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
