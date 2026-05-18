import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { DetailList, normalizeDetails } from "./detail-list";
import { ProgressBar } from "./progress-bar";
import { ResponsiveText } from "./responsive";
import type { BadgeState } from "./status-badge";

export type ResultPanelTone = "success" | "error" | "warning" | "info";

const TONE_COLOR: Record<ResultPanelTone, string> = {
  success: "green",
  error: "red",
  warning: "yellow",
  info: "cyan",
};

const TONE_STATE: Record<ResultPanelTone, BadgeState> = {
  success: "done",
  error: "failed",
  warning: "running",
  info: "pending",
};

export function resultPanelColor(tone: ResultPanelTone): string {
  return TONE_COLOR[tone];
}

export function resultPanelState(tone: ResultPanelTone): BadgeState {
  return TONE_STATE[tone];
}

export type ResultPanelProps = {
  title: string;
  tone?: ResultPanelTone;
  details?: string | string[];
  description?: string;
  progress?: number;
  progressWidth?: number;
  busy?: boolean;
};

export const ResultPanel: React.FC<ResultPanelProps> = ({
  title,
  tone = "info",
  details,
  description,
  progress,
  progressWidth = 36,
  busy = false,
}) => {
  const color = resultPanelColor(tone);
  const lines = normalizeDetails(details);

  return (
    <Box
      borderColor={color}
      borderStyle="single"
      flexDirection="column"
      paddingX={1}
    >
      <Box>
        {busy ? (
          <Text color={color}>
            <Spinner type="dots" />
          </Text>
        ) : null}
        <Box marginLeft={busy ? 1 : 0}>
          <ResponsiveText bold color={color} maxLines={1}>
            {title}
          </ResponsiveText>
        </Box>
      </Box>

      {progress !== undefined ? (
        <Box marginTop={1}>
          <ProgressBar percent={progress} width={progressWidth} />
        </Box>
      ) : null}

      {description ? (
        <Box marginTop={1}>
          <ResponsiveText dimColor maxLines={2}>
            {description}
          </ResponsiveText>
        </Box>
      ) : null}

      {lines.length > 0 ? (
        <DetailList
          details={lines}
          marginTop={1}
          state={resultPanelState(tone)}
        />
      ) : null}
    </Box>
  );
};
