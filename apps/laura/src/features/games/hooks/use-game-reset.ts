"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useGameReset(resetGame: () => Promise<void>) {
  const [isResetting, setIsResetting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!mountedRef.current) {
      return;
    }
    try {
      await resetGame();
    } finally {
      if (mountedRef.current) {
        setIsResetting(false);
      }
    }
  }, [resetGame]);

  return { isResetting, handleReset };
}
