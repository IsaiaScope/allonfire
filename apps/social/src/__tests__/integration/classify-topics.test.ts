import { getActiveProviderClient } from "@allonfire/content-generator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/classify-topics/route";
import { makeRequest, withAuth } from "../helpers/mock-request";

vi.mock("@allonfire/content-generator", () => ({
  getActiveProviderClient: vi.fn(),
}));

vi.mock("@allonfire/database", () => ({
  logWebhook: vi.fn(),
}));

const mockGenerate = vi.fn();

const validItem = {
  title: "OpenAI releases GPT-5",
  summary: "A major new model release",
  sourceUrl: "https://example.com/gpt5-release",
  sourceName: "TechCrunch",
};

describe("POST /api/classify-topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveProviderClient).mockResolvedValue({
      client: { generate: mockGenerate },
      model: "test-model",
    } as never);
  });

  it("rejects requests without auth", async () => {
    const request = makeRequest("/api/classify-topics", { items: [validItem] });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects empty items array", async () => {
    const request = makeRequest(
      "/api/classify-topics",
      { items: [] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("classifies items above threshold", async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        {
          index: 0,
          category: "NEWS",
          summary: "Test summary",
          relevance: 0.85,
        },
      ]),
    });

    const request = makeRequest(
      "/api/classify-topics",
      { items: [validItem] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.classified).toHaveLength(1);
    expect(body.classified[0].title).toBe(validItem.title);
    expect(body.total).toBe(1);
    expect(body.filtered).toBe(0);
  });

  it("filters items below threshold", async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        {
          index: 0,
          category: "NEWS",
          summary: "Low relevance item",
          relevance: 0.3,
        },
      ]),
    });

    const request = makeRequest(
      "/api/classify-topics",
      { items: [validItem] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.classified).toHaveLength(0);
    expect(body.filtered).toBe(1);
    expect(body.total).toBe(1);
  });

  it("returns 503 when no AI provider", async () => {
    vi.mocked(getActiveProviderClient).mockRejectedValue(
      new Error("No active provider")
    );

    const request = makeRequest(
      "/api/classify-topics",
      { items: [validItem] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("No AI provider");
  });
});
