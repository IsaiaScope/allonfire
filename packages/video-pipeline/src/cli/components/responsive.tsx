import { Text, type TextProps, useStdout } from "ink";
import type React from "react";
import { useSyncExternalStore } from "react";
import { displayWidth, takeDisplayWidth } from "../../lib/text";

const DEFAULT_TERMINAL_WIDTH = 80;
const ELLIPSIS = "...";
const WORD_SEPARATOR_RE = /\s+/;
type TerminalStdout = ReturnType<typeof useStdout>["stdout"];

type TerminalWidthStore = {
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
};

const widthStores = new WeakMap<TerminalStdout, TerminalWidthStore>();

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ellipsize(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  if (displayWidth(value) <= width) {
    return value;
  }
  if (width <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, width);
  }
  return `${takeDisplayWidth(value, width - ELLIPSIS.length)}${ELLIPSIS}`;
}

function markOverflow(value: string, width: number): string {
  return ellipsize(`${value}${ELLIPSIS}`, width);
}

function clampWord(word: string, width: number): string {
  if (displayWidth(word) <= width) {
    return word;
  }
  return ellipsize(word, width);
}

function finishClampedLines(
  lines: string[],
  current: string,
  overflow: boolean,
  width: number,
  maxLines: number
): string {
  let didOverflow = overflow;

  if (current.length > 0 && lines.length < maxLines) {
    lines.push(current);
  } else if (current.length > 0) {
    didOverflow = true;
  }

  if (lines.length > maxLines) {
    didOverflow = true;
    lines.length = maxLines;
  }

  if (didOverflow && lines.length > 0) {
    lines[lines.length - 1] = markOverflow(lines.at(-1) ?? "", width);
  }

  return lines.join("\n");
}

export function clampLines(value: string, width: number, maxLines = 2): string {
  if (width <= 0 || maxLines <= 0) {
    return "";
  }

  const words = value.trim().split(WORD_SEPARATOR_RE).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let current = "";
  let overflow = false;

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (displayWidth(next) <= width) {
      current = next;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
      current = "";
    }

    if (lines.length >= maxLines) {
      overflow = true;
      break;
    }

    current = clampWord(word, width);
  }

  return finishClampedLines(lines, current, overflow, width, maxLines);
}

function terminalWidthStore(stdout: TerminalStdout): TerminalWidthStore {
  const existing = widthStores.get(stdout);
  if (existing) {
    return existing;
  }

  let width = stdout.columns ?? DEFAULT_TERMINAL_WIDTH;
  let listening = false;
  const listeners = new Set<() => void>();
  const update = () => {
    const next = stdout.columns ?? DEFAULT_TERMINAL_WIDTH;
    if (next === width) {
      return;
    }
    width = next;
    for (const listener of listeners) {
      listener();
    }
  };

  const store: TerminalWidthStore = {
    getSnapshot: () => width,
    subscribe: (listener) => {
      listeners.add(listener);
      if (!listening) {
        update();
        stdout.on("resize", update);
        listening = true;
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && listening) {
          stdout.off("resize", update);
          listening = false;
        }
      };
    },
  };

  widthStores.set(stdout, store);
  return store;
}

export function useTerminalWidth(): number {
  const { stdout } = useStdout();
  const store = terminalWidthStore(stdout);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}

export type ResponsiveTextProps = Omit<TextProps, "children"> & {
  children: string | number;
  maxLines?: number;
  width?: number;
};

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  maxLines = 2,
  width,
  ...props
}) => {
  const terminalWidth = useTerminalWidth();
  const effectiveWidth = width ?? terminalWidth;
  return (
    <Text {...props} wrap="truncate-end">
      {clampLines(String(children), effectiveWidth, maxLines)}
    </Text>
  );
};
