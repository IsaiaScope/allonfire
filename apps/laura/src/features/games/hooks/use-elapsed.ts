import { useEffect, useState } from "react";
import { GAMES } from "../constants/games";

/**
 * The clock of a game, in milliseconds, for the eye only (the score's time is
 * the game's own, read at its end): zero until it starts, read every
 * hundredth of a second while it runs, then the game's own time. It lives in
 * its own leaf so a tick redraws the clock and never the cards.
 */
export const useElapsed = (startedAt: number | null, timeMs: number | null) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (startedAt === null) {
      setElapsedMs(0);
      return;
    }
    if (timeMs !== null) {
      setElapsedMs(timeMs);
      return;
    }
    const tick = setInterval(
      () => setElapsedMs(Date.now() - startedAt),
      GAMES.MEMORY.DELAY.CLOCK_MS
    );
    return () => clearInterval(tick);
  }, [startedAt, timeMs]);
  return elapsedMs;
};
