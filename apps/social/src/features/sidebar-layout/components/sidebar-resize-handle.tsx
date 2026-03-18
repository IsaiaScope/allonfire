"use client";

import { useCallback, useRef } from "react";
import { MAX_WIDTH, MIN_WIDTH } from "../constants/sidebar-constants";
import { useSidebarContext } from "../hooks/use-sidebar-context";

export function SidebarResizeHandle() {
  const { width, setWidth, isCollapsed } = useSidebarContext();
  const widthRef = useRef(width);
  widthRef.current = width;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startWidth + delta)
        );
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setWidth]
  );

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-border lg:block"
      onMouseDown={handleMouseDown}
    />
  );
}
