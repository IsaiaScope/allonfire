const CODE_BLOCK_START = /^```(?:json)?\n?/;
const CODE_BLOCK_END = /\n?```$/;

export function stripCodeBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(CODE_BLOCK_START, "").replace(CODE_BLOCK_END, "");
  }
  return trimmed;
}
