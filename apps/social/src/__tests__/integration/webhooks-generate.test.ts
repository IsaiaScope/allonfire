import { generatePromptForTopic } from "@allonfire/content-generator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/webhooks/generate/route";
import { makeRequest, withAuth } from "../helpers/mock-request";

vi.mock("@allonfire/content-generator", () => ({
  generatePromptForTopic: vi.fn(),
}));

vi.mock("@allonfire/database", () => ({
  getTopicsByStatus: vi.fn().mockResolvedValue([]),
  logWebhook: vi.fn(),
}));

describe("POST /api/webhooks/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without auth", async () => {
    const request = makeRequest("/api/webhooks/generate", {});
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("generates for specific topicId", async () => {
    vi.mocked(generatePromptForTopic).mockResolvedValue(undefined as never);

    const request = makeRequest(
      "/api/webhooks/generate",
      { topicId: "clx3fvsmu3pwujdp4ctwoo1gw" },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generated).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].success).toBe(true);
  });

  it("handles generation failure gracefully", async () => {
    vi.mocked(generatePromptForTopic).mockRejectedValue(
      new Error("Model unavailable")
    );

    const request = makeRequest(
      "/api/webhooks/generate",
      { topicId: "clx3fvsmu3pwujdp4ctwoo1gw" },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generated).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.results[0].error).toBe("Model unavailable");
  });

  it("rejects invalid body", async () => {
    const request = makeRequest(
      "/api/webhooks/generate",
      { topicId: "not-a-cuid2" },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
