import { describe, expect, it } from "vitest";
import { mapClassification, parseClassifications } from "./classify-utils";

describe("parseClassifications", () => {
  it("parses a valid JSON array", () => {
    const input = JSON.stringify([
      { index: 0, category: "NEWS", summary: "Big news", relevance: 0.9 },
    ]);
    const result = parseClassifications(input, 1);
    expect(result).toEqual([
      { index: 0, category: "NEWS", summary: "Big news", relevance: 0.9 },
    ]);
  });

  it("strips code block wrapper before parsing", () => {
    const json = JSON.stringify([
      { index: 0, category: "LEARNING", summary: "Tutorial", relevance: 0.8 },
    ]);
    const wrapped = `\`\`\`json\n${json}\n\`\`\``;
    const result = parseClassifications(wrapped, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("LEARNING");
  });

  it("returns fallback array on invalid JSON", () => {
    const result = parseClassifications("not valid json at all", 3);
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.category).toBe("NEWS");
      expect(item.summary).toBe("");
      expect(item.relevance).toBe(0.4);
    }
  });

  it("fallback array length matches batchLength", () => {
    const result = parseClassifications("totally broken {{", 5);
    expect(result).toHaveLength(5);
  });
});

const makeBatch = (count = 1) =>
  Array.from({ length: count }, (_, i) => ({
    title: `Title ${i}`,
    summary: `Summary ${i}`,
    sourceUrl: `https://example.com/${i}`,
    sourceName: `Source ${i}`,
  }));

describe("mapClassification", () => {
  it("returns a topic when relevance is above threshold", () => {
    const batch = makeBatch();
    const cls = {
      index: 0,
      category: "NEWS",
      summary: "AI news",
      relevance: 0.8,
    };
    const result = mapClassification(cls, batch);
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Title 0");
    expect(result?.summary).toBe("AI news");
    expect(result?.category).toBe("NEWS");
    expect(result?.rawData).toEqual({ aiRelevance: 0.8 });
  });

  it("returns null when relevance is below threshold", () => {
    const batch = makeBatch();
    const cls = { index: 0, category: "NEWS", summary: "Low", relevance: 0.5 };
    expect(mapClassification(cls, batch)).toBeNull();
  });

  it("passes when relevance equals threshold exactly", () => {
    const batch = makeBatch();
    const cls = { index: 0, category: "NEWS", summary: "Edge", relevance: 0.6 };
    const result = mapClassification(cls, batch);
    expect(result).not.toBeNull();
  });

  it("defaults invalid category to NEWS", () => {
    const batch = makeBatch();
    const cls = {
      index: 0,
      category: "INVALID_CAT",
      summary: "Test",
      relevance: 0.9,
    };
    const result = mapClassification(cls, batch);
    expect(result?.category).toBe("NEWS");
  });

  it("uses original.summary when cls.summary is empty", () => {
    const batch = makeBatch();
    const cls = { index: 0, category: "NEWS", summary: "", relevance: 0.7 };
    const result = mapClassification(cls, batch);
    expect(result?.summary).toBe("Summary 0");
  });

  it("uses original.title when both summaries are empty", () => {
    const batch = [
      {
        title: "Fallback Title",
        sourceUrl: "https://example.com",
        sourceName: "Test",
      },
    ];
    const cls = { index: 0, category: "NEWS", summary: "", relevance: 0.7 };
    const result = mapClassification(cls, batch);
    expect(result?.summary).toBe("Fallback Title");
  });

  it("wraps index with modulo on batch length", () => {
    const batch = makeBatch(2);
    const cls = {
      index: 5,
      category: "LEARNING",
      summary: "Wrapped",
      relevance: 0.9,
    };
    const result = mapClassification(cls, batch);
    expect(result).not.toBeNull();
    // 5 % 2 = 1
    expect(result?.title).toBe("Title 1");
  });

  it("merges existing rawData with aiRelevance", () => {
    const batch = [
      {
        title: "Test",
        sourceUrl: "https://example.com",
        sourceName: "Src",
        rawData: { existing: true, score: 42 },
      },
    ];
    const cls = { index: 0, category: "NEWS", summary: "S", relevance: 0.8 };
    const result = mapClassification(cls, batch);
    expect(result?.rawData).toEqual({
      existing: true,
      score: 42,
      aiRelevance: 0.8,
    });
  });
});
