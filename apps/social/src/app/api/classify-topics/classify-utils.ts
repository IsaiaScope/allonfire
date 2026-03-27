import { stripCodeBlock } from "@/lib/parse-ai-response";
import { safeRawData } from "@/lib/raw-data";

const RELEVANCE_THRESHOLD = 0.6;

const VALID_CATEGORIES = new Set([
  "NEWS",
  "MEME_WORTHY",
  "LEARNING",
  "TOOL_RELEASE",
  "AI_UPDATE",
]);

export type ClassificationResult = {
  index: number;
  category: string;
  summary: string;
  relevance: number;
};

type Item = {
  title: string;
  summary?: string;
  sourceUrl: string;
  sourceName: string;
  rawData?: unknown;
};

export type ClassifiedTopic = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  rawData?: unknown;
};

export function parseClassifications(
  responseText: string,
  batchLength: number
): ClassificationResult[] {
  try {
    return JSON.parse(stripCodeBlock(responseText));
  } catch {
    return Array.from({ length: batchLength }, (_, idx) => ({
      index: idx,
      category: "NEWS",
      summary: "",
      relevance: 0.4,
    }));
  }
}

export function mapClassification(
  cls: ClassificationResult,
  batch: Item[]
): ClassifiedTopic | null {
  const relevance = Number(cls.relevance) || 0;
  if (relevance < RELEVANCE_THRESHOLD) {
    return null;
  }

  const original = batch[cls.index % batch.length];
  if (!original) {
    return null;
  }

  const category = VALID_CATEGORIES.has(cls.category) ? cls.category : "NEWS";

  const existingData = safeRawData(original.rawData);

  return {
    title: original.title,
    summary: cls.summary || original.summary || original.title,
    sourceUrl: original.sourceUrl,
    sourceName: original.sourceName,
    category,
    rawData: {
      ...existingData,
      aiRelevance: relevance,
    },
  };
}
