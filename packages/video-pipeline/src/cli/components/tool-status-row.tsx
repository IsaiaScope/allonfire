import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { DetailList, formatDetailLine, normalizeDetails } from "./detail-list";
import { type BadgeState, StatusBadge } from "./status-badge";

export type ToolStatusRowProps = {
  label: string;
  state: BadgeState;
  details?: string | string[];
  statusLabel?: string;
  marginBottom?: number;
};

const STATUS_GUTTER_WIDTH = 3;

const STATUS_LABEL: Record<BadgeState, string> = {
  pending: "Queued",
  running: "Working",
  done: "Ready",
  failed: "Error",
};

export const STATUS_COLOR: Record<BadgeState, string> = {
  pending: "gray",
  running: "yellow",
  done: "green",
  failed: "red",
};

export const ToolStatusRow: React.FC<ToolStatusRowProps> = ({
  label,
  state,
  details,
  statusLabel,
  marginBottom,
}) => {
  const lines = normalizeDetails(details).map(formatDetailLine);

  return (
    <Box
      flexDirection="column"
      marginBottom={marginBottom ?? (lines.length > 0 ? 1 : 0)}
    >
      <Box>
        <Box width={STATUS_GUTTER_WIDTH}>
          {state === "running" ? (
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
          ) : (
            <StatusBadge state={state} />
          )}
        </Box>
        <Box>
          <Text bold>{label}</Text>
          <Text color="gray" dimColor>
            {" → "}
          </Text>
          <Text color={STATUS_COLOR[state]}>
            {statusLabel ?? STATUS_LABEL[state]}
          </Text>
        </Box>
      </Box>

      {lines.length > 0 ? (
        <DetailList
          details={details}
          marginLeft={STATUS_GUTTER_WIDTH}
          marginTop={1}
          state={state}
        />
      ) : null}
    </Box>
  );
};

export const ToolStatusList: React.FC<{
  rows: ToolStatusRowProps[];
}> = ({ rows }) => {
  return (
    <>
      {rows.map((row, index) => (
        <ToolStatusRow
          details={row.details}
          key={row.label}
          label={row.label}
          marginBottom={index === rows.length - 1 ? 0 : undefined}
          state={row.state}
          statusLabel={row.statusLabel}
        />
      ))}
    </>
  );
};
