import { Box, Text } from "ink";
import type React from "react";
import { normalizeDetails } from "./detail-list";
import type { BadgeState } from "./status-badge";
import { ToolStatusList, type ToolStatusRowProps } from "./tool-status-row";

const STATUS_LABEL: Record<BadgeState, string> = {
  pending: "Queued",
  running: "Working",
  done: "Ready",
  failed: "Failed",
};

export type PipelineStage = {
  id: string;
  label: string;
  detail: string | string[];
  state: BadgeState;
  statusLabel?: string;
  statusLabels?: Partial<Record<BadgeState, string>>;
};

function pipelineDetailLine(line: string): string {
  return line.includes(":") ? line : `Details: ${line}`;
}

export function pipelineStageRows(
  stages: PipelineStage[]
): ToolStatusRowProps[] {
  return stages.map((stage) => ({
    details: normalizeDetails(stage.detail).map(pipelineDetailLine),
    label: stage.label,
    state: stage.state,
    statusLabel:
      stage.statusLabel ??
      stage.statusLabels?.[stage.state] ??
      STATUS_LABEL[stage.state],
  }));
}

export const Pipeline: React.FC<{ stages: PipelineStage[] }> = ({ stages }) => {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Pipeline</Text>
      <Box flexDirection="column" marginTop={1}>
        <ToolStatusList rows={pipelineStageRows(stages)} />
      </Box>
    </Box>
  );
};
