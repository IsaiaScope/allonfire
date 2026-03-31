"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HEART_BURST_DURATION_MS = 600;

export function useHeartAnimation() {
  const [animating, setAnimating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const trigger = useCallback(() => {
    clearTimeout(timer.current);
    setAnimating(true);
    timer.current = setTimeout(
      () => setAnimating(false),
      HEART_BURST_DURATION_MS
    );
  }, []);

  return { animating, trigger };
}
