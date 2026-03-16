export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
] as const;

export const OPENROUTER_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
  },
] as const;

export const DEFAULT_MODELS = {
  ANTHROPIC: "claude-sonnet-4-20250514",
  OPENROUTER: "anthropic/claude-sonnet-4",
} as const;
