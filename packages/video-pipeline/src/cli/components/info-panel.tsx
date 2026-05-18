import { Box, Text } from "ink";
import type React from "react";
import { DetailList, normalizeDetails } from "./detail-list";
import { ResponsiveText } from "./responsive";

export type InfoPanelProps = {
  borderColor?: string;
  details?: string | string[];
  title: string;
};

export const InfoPanel: React.FC<InfoPanelProps> = ({
  borderColor = "cyan",
  details,
  title,
}) => {
  const lines = normalizeDetails(details);

  return (
    <Box
      borderColor={borderColor}
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <ResponsiveText bold color={borderColor} maxLines={1}>
        {title}
      </ResponsiveText>
      {lines.length > 0 ? (
        <DetailList details={lines} marginTop={1} />
      ) : (
        <Text dimColor>No details available</Text>
      )}
    </Box>
  );
};
