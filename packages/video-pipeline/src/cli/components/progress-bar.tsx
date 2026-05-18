import { Box, Text } from "ink";
import type React from "react";
import { clampNumber, ResponsiveText, useTerminalWidth } from "./responsive";

export const ProgressBar: React.FC<{
  percent: number;
  message?: string;
  maxWidth?: number;
  minWidth?: number;
  showDetails?: boolean;
  showMessage?: boolean;
  width?: number;
}> = ({
  percent,
  message = "",
  maxWidth,
  minWidth = 12,
  showDetails = true,
  showMessage = false,
  width = 30,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const terminalWidth = useTerminalWidth();
  const percentText = `${clamped}%`;
  const maxBarWidth = maxWidth ?? width;
  const detailWidth = showDetails ? percentText.length + 1 : 0;
  const messageWidth = showDetails && showMessage ? 24 : 0;
  const availableWidth = terminalWidth - detailWidth - messageWidth - 8;
  const barWidth = clampNumber(
    Math.min(maxBarWidth, availableWidth),
    minWidth,
    maxBarWidth
  );
  const filled = Math.round((clamped / 100) * barWidth);
  const empty = barWidth - filled;
  return (
    <Box>
      <Box width={barWidth}>
        <Text color="green">{"█".repeat(filled)}</Text>
        <Text dimColor>{"░".repeat(empty)}</Text>
      </Box>
      {showDetails ? (
        <Box marginLeft={1}>
          <Text>{clamped}%</Text>
        </Box>
      ) : null}
      {showDetails && showMessage ? (
        <Box marginLeft={2} width={messageWidth}>
          <ResponsiveText dimColor maxLines={1} width={messageWidth}>
            {message}
          </ResponsiveText>
        </Box>
      ) : null}
    </Box>
  );
};
