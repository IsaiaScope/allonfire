import { Text } from "ink";
import type React from "react";

export type BadgeState = "pending" | "running" | "done" | "failed";

const SYMBOL: Record<BadgeState, string> = {
  pending: "·",
  running: "⏳",
  done: "✓",
  failed: "✗",
};

const COLOR: Record<BadgeState, string> = {
  pending: "gray",
  running: "yellow",
  done: "green",
  failed: "red",
};

export const StatusBadge: React.FC<{ state: BadgeState }> = ({ state }) => (
  <Text color={COLOR[state]}>{SYMBOL[state]}</Text>
);
