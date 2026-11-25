"use client";

import { formatClock } from "@allonfire/core/shared/utils/format-time";
import { useElapsed } from "../hooks/use-elapsed";

/** The board's time, as `m:ss.cc`; the only part of the board a tick redraws. */
export const GameClock = ({
  startedAt,
  timeMs,
}: {
  startedAt: number | null;
  timeMs: number | null;
}) => formatClock(useElapsed(startedAt, timeMs));
