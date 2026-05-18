import { Box, Text } from "ink";
import type React from "react";
import { firstGrapheme } from "../../lib/text";
import { ResponsiveText } from "./responsive";

const CASE_SENSITIVE_PREFIX_RE = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.|[./~`-])/i;

export function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }
  if (CASE_SENSITIVE_PREFIX_RE.test(trimmed)) {
    return trimmed;
  }
  const first = firstGrapheme(trimmed);
  return `${first.toUpperCase()}${trimmed.slice(first.length)}`;
}

export const Header: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="cyan">
      ▸ {sentenceCase(title)}
    </Text>
    {subtitle ? (
      <ResponsiveText dimColor>{sentenceCase(subtitle)}</ResponsiveText>
    ) : null}
  </Box>
);
