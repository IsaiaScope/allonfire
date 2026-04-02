"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useGameReset(resetGame: () => Promise<void>) {
  const [isResetting, setIsResetting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!mountedRef.current) {
      return;
    }
    await resetGame();
    if (!mountedRef.current) {
      return;
    }
    setIsResetting(false);
  }, [resetGame]);

  return { isResetting, handleReset };
}
