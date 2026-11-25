"use client";

import { useCallback, useState } from "react";
import { fitGrid, type Room } from "../utils/fit-grid";

/**
 * The layout that fits the room its element is given, read again whenever the
 * room changes (a phone turned, a window resized). Nothing is laid out until
 * the room is measured (`fit` is null), so the first paint never shows a grid
 * that jumps. Put `ref` on the element that fills the room.
 */
export const useMemoryGridSize = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) {
      return;
    }
    // The same size again keeps the same room, so the first read and the observer's first call draw once.
    const read = () =>
      setRoom((current) =>
        current?.height === node.clientHeight &&
        current.width === node.clientWidth
          ? current
          : { height: node.clientHeight, width: node.clientWidth }
      );
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { fit: room ? fitGrid(room) : null, ref };
};
