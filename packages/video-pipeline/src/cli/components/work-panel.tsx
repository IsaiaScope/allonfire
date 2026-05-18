import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { ProgressBar } from "./progress-bar";
import { clampNumber, ResponsiveText, useTerminalWidth } from "./responsive";

export type WorkPanelProps = {
  title: string;
  description?: string;
  current?: string;
  currentMaxLines?: number;
  descriptionMaxLines?: number;
  progress?: number;
  progressWidth?: number;
  borderColor?: string;
  busy?: boolean;
};

export function workPanelContentWidth(terminalWidth: number): number {
  return clampNumber(terminalWidth - 4, 12, terminalWidth);
}

export const WorkPanel: React.FC<WorkPanelProps> = ({
  title,
  description,
  current,
  currentMaxLines = 4,
  descriptionMaxLines = 3,
  progress,
  progressWidth = 42,
  borderColor = "yellow",
  busy = false,
}) => {
  const contentWidth = workPanelContentWidth(useTerminalWidth());
  const titleWidth = busy ? Math.max(12, contentWidth - 2) : contentWidth;

  return (
    <Box
      borderColor={borderColor}
      borderStyle="single"
      flexDirection="column"
      paddingX={1}
    >
      <Box>
        {busy ? (
          <Text color={borderColor}>
            <Spinner type="dots" />
          </Text>
        ) : null}
        <Box marginLeft={busy ? 1 : 0} width={titleWidth}>
          <ResponsiveText color={borderColor} maxLines={2} width={titleWidth}>
            {title}
          </ResponsiveText>
        </Box>
      </Box>

      {description ? (
        <ResponsiveText
          dimColor
          maxLines={descriptionMaxLines}
          width={contentWidth}
        >
          {description}
        </ResponsiveText>
      ) : null}

      {progress !== undefined ? (
        <Box marginTop={1}>
          <ProgressBar percent={progress} width={progressWidth} />
        </Box>
      ) : null}

      {current ? (
        <Box marginTop={1} width={contentWidth}>
          <ResponsiveText
            dimColor
            maxLines={currentMaxLines}
            width={contentWidth}
          >
            {current}
          </ResponsiveText>
        </Box>
      ) : null}
    </Box>
  );
};
