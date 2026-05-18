import { Box } from "ink";
import type React from "react";
import { ResponsiveText } from "./responsive";

export const InfoLines: React.FC<{
  lines: string[];
  marginBottom?: number;
  marginTop?: number;
}> = ({ lines, marginBottom, marginTop }) => (
  <Box flexDirection="column" marginBottom={marginBottom} marginTop={marginTop}>
    {lines.map((line) => (
      <ResponsiveText dimColor key={line}>
        {line}
      </ResponsiveText>
    ))}
  </Box>
);
