import type {
  TopicCategory,
  TopicStatus,
} from "../../../generated/prisma/client";
import {
  TEST_CONTENT_PREFIX,
  TEST_EMAIL_SUFFIX,
  TEST_MODEL_PREFIX,
  TEST_URL_PREFIX,
} from "./db-setup";

type TestTopic = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: TopicCategory;
  status: TopicStatus;
  rawData?: unknown;
};

/**
 * 15 curated topics covering all 5 categories and 3 statuses.
 * All sourceUrls use TEST_URL_PREFIX so cleanup is surgical.
 * Categories: NEWS(3), TOOL_RELEASE(3), AI_UPDATE(3), LEARNING(2), MEME_WORTHY(2)
 * Statuses: DISCOVERED(3), AI_PICKED(5), SELECTED(5)
 */
export const TEST_TOPICS: TestTopic[] = [
  // NEWS — 3
  {
    title: `${TEST_CONTENT_PREFIX}Xcode beta adds GPT-5, Claude account support`,
    summary: "Apple's new Xcode beta includes support for GPT-5 and Claude.",
    sourceUrl: `${TEST_URL_PREFIX}xcode-beta`,
    sourceName: "Hacker News",
    category: "NEWS",
    status: "SELECTED",
    rawData: { aiRelevance: 0.85 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Anthropic takes legal action against OpenCode`,
    summary: "Anthropic is taking legal action against OpenCode.",
    sourceUrl: `${TEST_URL_PREFIX}anthropic-legal`,
    sourceName: "HN Best",
    category: "NEWS",
    status: "AI_PICKED",
    rawData: { aiRelevance: 0.95 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Advent of Code AI/LLM Policy`,
    summary: "Advent of Code adapts to AI with new LLM policy.",
    sourceUrl: `${TEST_URL_PREFIX}advent-of-code`,
    sourceName: "Hacker News",
    category: "NEWS",
    status: "DISCOVERED",
    rawData: { aiRelevance: 0.77 },
  },

  // TOOL_RELEASE — 3
  {
    title: `${TEST_CONTENT_PREFIX}GitNexus: Code intelligence engine`,
    summary: "Knowledge graphs, impact analysis, and safe refactoring.",
    sourceUrl: `${TEST_URL_PREFIX}gitnexus`,
    sourceName: "GitHub Trending",
    category: "TOOL_RELEASE",
    status: "SELECTED",
    rawData: { aiRelevance: 0.85 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Agent-Orchestrator: Multi-agent CLI`,
    summary: "Three AI agents. One brain. Zero downtime.",
    sourceUrl: `${TEST_URL_PREFIX}agent-orchestrator`,
    sourceName: "GitHub Trending",
    category: "TOOL_RELEASE",
    status: "SELECTED",
    rawData: { aiRelevance: 0.85 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Nvidia greenboost: extend GPU VRAM`,
    summary: "Transparently extend GPU VRAM using system RAM/NVMe.",
    sourceUrl: `${TEST_URL_PREFIX}greenboost`,
    sourceName: "Lobsters AI",
    category: "TOOL_RELEASE",
    status: "AI_PICKED",
    rawData: { aiRelevance: 0.88 },
  },

  // AI_UPDATE — 3
  {
    title: `${TEST_CONTENT_PREFIX}Gemini 3.1 Pro for complex tasks`,
    summary: "Google releases upgraded core intelligence model.",
    sourceUrl: `${TEST_URL_PREFIX}gemini-31-pro`,
    sourceName: "DeepMind",
    category: "AI_UPDATE",
    status: "SELECTED",
    rawData: { aiRelevance: 0.9 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Doc-to-LoRA from documents`,
    summary: "Sakana AI's method to create LoRAs from documents on-the-fly.",
    sourceUrl: `${TEST_URL_PREFIX}doc-to-lora`,
    sourceName: "Reddit r/MachineLearning",
    category: "AI_UPDATE",
    status: "AI_PICKED",
    rawData: { aiRelevance: 0.82 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Kimi replaces residual connections`,
    summary: "Attention residuals replace standard residual connections.",
    sourceUrl: `${TEST_URL_PREFIX}kimi-residuals`,
    sourceName: "Reddit r/LocalLLaMA",
    category: "AI_UPDATE",
    status: "DISCOVERED",
    rawData: { aiRelevance: 0.85 },
  },

  // LEARNING — 2
  {
    title: `${TEST_CONTENT_PREFIX}First Rule of ML: Start Without ML`,
    summary: "Practical advice on problem-solving before jumping to ML.",
    sourceUrl: `${TEST_URL_PREFIX}first-rule-ml`,
    sourceName: "Hacker News",
    category: "LEARNING",
    status: "AI_PICKED",
    rawData: { aiRelevance: 0.8 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}Building Production-Ready RAG Systems`,
    summary: "End-to-end guide for retrieval-augmented generation.",
    sourceUrl: `${TEST_URL_PREFIX}rag-systems`,
    sourceName: "Towards Data Science",
    category: "LEARNING",
    status: "DISCOVERED",
    rawData: { aiRelevance: 0.78 },
  },

  // MEME_WORTHY — 2
  {
    title: `${TEST_CONTENT_PREFIX}TinyLlama on PowerBook G4`,
    summary: "Someone ran TinyLlama 1.1B on a 2002 PowerBook offline.",
    sourceUrl: `${TEST_URL_PREFIX}tinyllama-powerbook`,
    sourceName: "Reddit r/LocalLLaMA",
    category: "MEME_WORTHY",
    status: "AI_PICKED",
    rawData: { aiRelevance: 0.95 },
  },
  {
    title: `${TEST_CONTENT_PREFIX}AI passes 100% tests (all skipped)`,
    summary: "Hilarious dev humor about testing with AI.",
    sourceUrl: `${TEST_URL_PREFIX}ai-tests-meme`,
    sourceName: "Twitter",
    category: "MEME_WORTHY",
    status: "SELECTED",
    rawData: { aiRelevance: 0.9 },
  },
];

/** Subset for ingestion tests (no status field — ingestTopics creates as DISCOVERED) */
export const INGEST_TOPICS = TEST_TOPICS.slice(0, 5).map(
  ({ status: _status, ...rest }) => rest
);

export const TEST_USER = {
  email: `test${TEST_EMAIL_SUFFIX}`,
  name: `${TEST_CONTENT_PREFIX}Test User`,
  role: "ADMIN" as const,
};

export const TEST_PROVIDER = {
  provider: "ANTHROPIC" as const,
  apiKey: "sk-test-key-123",
  model: `${TEST_MODEL_PREFIX}claude-sonnet-4-20250514`,
  isVerified: true,
};

export const TEST_SOCIAL_ACCOUNT = {
  platform: "TWITTER" as const,
  accessToken: "test-access-token-xyz",
  refreshToken: "test-refresh-token-xyz",
  platformUserId: "12345",
  platformUsername: "testuser",
};
