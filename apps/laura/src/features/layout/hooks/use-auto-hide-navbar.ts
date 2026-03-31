"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { SCROLL_CONTAINER_SELECTOR } from "@/features/layout/constants";

const SCROLL_DELTA_THRESHOLD = 50;
const IDLE_HIDE_DELAY_MS = 3000;

/**
 * Gallery navbar auto-hide behavior:
 * - Hidden on mount (before paint, no flash)
 * - Scrolling up → reveals navbar
 * - Scrolling down → hides navbar
 * - 3 seconds of scroll inactivity when not at top → hides navbar
 * - Direction changes require a 50px threshold to prevent flickering
 * - Disabled (non-gallery pages) → always visible
 */
export function useAutoHideNavbar(enabled: boolean, paused: boolean): boolean {
  const [visible, setVisible] = useState(!enabled);
  const lastScrollTop = useRef(0);
  const accumulatedDelta = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<Element | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (
        !pausedRef.current &&
        containerRef.current &&
        containerRef.current.scrollTop > 0
      ) {
        setVisible(false);
      }
    }, IDLE_HIDE_DELAY_MS);
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      setVisible(true);
      containerRef.current = null;
      return;
    }

    setVisible(false);

    const container = document.querySelector(SCROLL_CONTAINER_SELECTOR);
    containerRef.current = container;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const delta = currentScrollTop - lastScrollTop.current;
      lastScrollTop.current = currentScrollTop;

      // Same direction → accumulate; direction changed → reset
      if (
        (accumulatedDelta.current > 0 && delta > 0) ||
        (accumulatedDelta.current < 0 && delta < 0)
      ) {
        accumulatedDelta.current += delta;
      } else {
        accumulatedDelta.current = delta;
      }

      // Scrolling up (negative delta) → show
      if (accumulatedDelta.current < -SCROLL_DELTA_THRESHOLD) {
        setVisible(true);
      }
      // Scrolling down (positive delta) → hide
      else if (accumulatedDelta.current > SCROLL_DELTA_THRESHOLD) {
        setVisible(false);
      }

      resetIdleTimer();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(idleTimer.current);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, resetIdleTimer]);

  // Restart idle timer when interaction ends (sheet closes, pointer leaves)
  useLayoutEffect(() => {
    if (!enabled || paused) {
      return;
    }

    if (containerRef.current) {
      resetIdleTimer();
    }
  }, [enabled, paused, resetIdleTimer]);

  return visible;
}
