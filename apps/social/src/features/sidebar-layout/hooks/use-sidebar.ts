"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_NAME,
  DEFAULT_WIDTH,
  MAX_WIDTH,
  MIN_WIDTH,
  type SidebarState,
} from "../constants/sidebar-constants";

function persistState(state: SidebarState) {
  const value = JSON.stringify(state);
  // biome-ignore lint/suspicious/noDocumentCookie: client-side cookie persistence for SSR hydration
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
  try {
    localStorage.setItem(COOKIE_NAME, value);
  } catch {
    // localStorage unavailable
  }
}

export function useSidebar(defaultState?: SidebarState) {
  const [state, setState] = useState<SidebarState>(
    () => defaultState ?? { isCollapsed: false, width: DEFAULT_WIDTH }
  );
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isCollapseAnimationDone, setCollapseAnimationDone] = useState(false);

  // When the sidebar loads already collapsed (from persisted state),
  // defer enabling tooltips until after the first paint to avoid a flash
  const initialCollapsed = defaultState?.isCollapsed ?? false;
  useEffect(() => {
    if (initialCollapsed) {
      setCollapseAnimationDone(true);
    }
  }, [initialCollapsed]);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, isCollapsed: !prev.isCollapsed };
      persistState(next);
      setCollapseAnimationDone(false);
      return next;
    });
  }, []);

  const onCollapseAnimationComplete = useCallback(() => {
    setCollapseAnimationDone(true);
  }, []);

  const setWidth = useCallback((w: number) => {
    setState((prev) => {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
      const next = { ...prev, width: clamped };
      persistState(next);
      return next;
    });
  }, []);

  const openSheet = useCallback(() => setMobileSheetOpen(true), []);
  const closeSheet = useCallback(() => setMobileSheetOpen(false), []);

  return {
    isCollapsed: state.isCollapsed,
    width: state.width,
    isMobileSheetOpen,
    isCollapseAnimationDone,
    toggle,
    setWidth,
    openSheet,
    closeSheet,
    setMobileSheetOpen,
    onCollapseAnimationComplete,
  };
}
