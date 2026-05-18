import { Box, Text } from "ink";
import type React from "react";
import { displayWidth, firstGrapheme } from "../../lib/text";
import {
  clampNumber,
  ellipsize,
  ResponsiveText,
  useTerminalWidth,
} from "./responsive";
import type { BadgeState } from "./status-badge";

export type DetailLine = {
  key?: string;
  value: string;
};

const DETAIL_GUTTER_WIDTH = 3;
const CASE_SENSITIVE_PREFIX_RE = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.|[./~`-])/i;
const TECHNICAL_FIRST_WORD_RE = /^[^\s]*[0-9._-][^\s]*/;
const STATUS_COLOR: Record<BadgeState, string> = {
  pending: "gray",
  running: "yellow",
  done: "green",
  failed: "red",
};
const FULL_VALUE_KEYS = new Set(["Folder", "Path"]);
const FULL_RESULT_KEYS = new Set(["Command", "Error", "Fix", "Hint", "Next"]);
const DETAIL_KEY_MAX_WIDTH = 18;
const DETAIL_VALUE_MIN_WIDTH = 12;
const CASE_SENSITIVE_VALUE_KEYS = new Set([
  "Command",
  "Error",
  "Fix",
  "Folder",
  "Hint",
  "Next",
  "Path",
]);

export function normalizeDetails(details?: string | string[]): string[] {
  if (details === undefined) {
    return [];
  }
  return (Array.isArray(details) ? details : [details]).filter(
    (line) => line.trim().length > 0
  );
}

function displayPhrase(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    CASE_SENSITIVE_PREFIX_RE.test(trimmed) ||
    TECHNICAL_FIRST_WORD_RE.test(trimmed)
  ) {
    return trimmed;
  }
  const first = firstGrapheme(trimmed);
  return `${first.toUpperCase()}${trimmed.slice(first.length)}`;
}

export function formatDetailLine(line: string): DetailLine {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return { value: displayPhrase(line) };
  }

  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();
  const displayKey = displayPhrase(key);
  return {
    key: displayKey,
    value: CASE_SENSITIVE_VALUE_KEYS.has(displayKey)
      ? value
      : displayPhrase(value),
  };
}

export function detailValueColor(
  line: DetailLine,
  state?: BadgeState
): string | undefined {
  if (line.key === "Status" && state !== undefined) {
    return STATUS_COLOR[state];
  }
  if (line.key === "Error") {
    return "red";
  }
  if (
    line.key === "Version" ||
    line.key === "Date" ||
    line.key === "Quality" ||
    line.key === "Flags" ||
    line.key === "Run mode" ||
    line.key === "Format" ||
    line.key === "Language" ||
    line.key === "Model" ||
    line.key === "Segments" ||
    line.key === "Engine" ||
    line.key === "Agent" ||
    line.key === "Target"
  ) {
    return "yellow";
  }
  if (
    line.key === "Path" ||
    line.key === "Action" ||
    line.key === "Folder" ||
    line.key === "Project" ||
    line.key === "Slug" ||
    line.key === "Source" ||
    line.key === "Input" ||
    line.key === "Output" ||
    line.key === "Creates" ||
    line.key === "Writes" ||
    line.key === "Updates" ||
    line.key === "Video" ||
    line.key === "Captions" ||
    line.key === "Next" ||
    line.key === "Command"
  ) {
    return "cyan";
  }
  if (line.key === "Fix" || line.key === "Hint") {
    return "yellow";
  }
  if (!line.key && state === "running") {
    return "yellow";
  }
  return undefined;
}

export function detailKeyWidth(
  lines: DetailLine[],
  terminalWidth: number,
  marginLeft = 0
): number {
  const idealWidth =
    lines.reduce(
      (max, line) => Math.max(max, displayWidth(line.key ?? "")),
      0
    ) + 2;
  if (idealWidth === 2) {
    return 0;
  }

  const availableWidth = terminalWidth - marginLeft - DETAIL_GUTTER_WIDTH - 4;
  const responsiveMaxWidth = clampNumber(
    Math.floor(availableWidth * 0.38),
    terminalWidth < 48 ? 6 : 8,
    DETAIL_KEY_MAX_WIDTH
  );
  return clampNumber(idealWidth, 0, responsiveMaxWidth);
}

export const DetailList: React.FC<{
  details?: string | string[];
  marginLeft?: number;
  marginTop?: number;
  state?: BadgeState;
}> = ({ details, marginLeft = 0, marginTop = 0, state }) => {
  const terminalWidth = useTerminalWidth();
  const lines = normalizeDetails(details).map(formatDetailLine);
  const keyWidth = detailKeyWidth(lines, terminalWidth, marginLeft);
  const valueWidth = Math.max(
    DETAIL_VALUE_MIN_WIDTH,
    terminalWidth - marginLeft - DETAIL_GUTTER_WIDTH - 4 - keyWidth
  );

  if (lines.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
      {lines.map((line) => {
        const color = detailValueColor(line, state);
        const fullValue =
          line.key !== undefined &&
          (FULL_VALUE_KEYS.has(line.key) || FULL_RESULT_KEYS.has(line.key));
        return (
          <Box key={`${line.key ?? ""}:${line.value}`}>
            <Box width={2}>
              <Text color="gray" dimColor>
                •
              </Text>
            </Box>
            {line.key ? (
              <Box width={keyWidth}>
                <Text color="gray" dimColor>
                  {ellipsize(line.key, Math.max(0, keyWidth - 1))}
                </Text>
              </Box>
            ) : null}
            <Box width={valueWidth}>
              {fullValue ? (
                <Text color={color} dimColor={color === undefined} wrap="wrap">
                  {line.value}
                </Text>
              ) : (
                <ResponsiveText
                  color={color}
                  dimColor={color === undefined}
                  width={valueWidth}
                >
                  {line.value}
                </ResponsiveText>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
