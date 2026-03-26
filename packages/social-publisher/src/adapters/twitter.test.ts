import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedTokens, PublishRequest } from "../types";

const mockTweet = vi.fn();
const mockMe = vi.fn();

vi.mock("twitter-api-v2", () => {
  return {
    TwitterApi: class MockTwitterApi {
      v2 = { tweet: mockTweet, me: mockMe };
    },
  };
});

// Must import after vi.mock
const { createTwitterAdapter } = await import("./twitter");

const tokens: DecryptedTokens = { accessToken: "test-token" };
const request: PublishRequest = { content: "Hello from tests!" };

describe("createTwitterAdapter", () => {
  beforeEach(() => {
    mockTweet.mockReset();
    mockMe.mockReset();
  });

  it("publishes tweet and returns post ID + URL", async () => {
    mockTweet.mockResolvedValue({ data: { id: "12345" } });

    const adapter = createTwitterAdapter();
    const result = await adapter.publish(request, tokens);

    expect(result).toEqual({
      success: true,
      platformPostId: "12345",
      platformUrl: "https://twitter.com/i/web/status/12345",
    });
    expect(mockTweet).toHaveBeenCalledWith({ text: "Hello from tests!" });
  });

  it("returns error on API failure", async () => {
    mockTweet.mockRejectedValue(new Error("Rate limit exceeded"));

    const adapter = createTwitterAdapter();
    const result = await adapter.publish(request, tokens);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Rate limit exceeded");
  });

  it("validates tokens successfully", async () => {
    mockMe.mockResolvedValue({ data: { id: "user-1" } });

    const adapter = createTwitterAdapter();
    const valid = await adapter.validateTokens(tokens);

    expect(valid).toBe(true);
    expect(mockMe).toHaveBeenCalled();
  });

  it("validates tokens returns false on failure", async () => {
    mockMe.mockRejectedValue(new Error("Unauthorized"));

    const adapter = createTwitterAdapter();
    const valid = await adapter.validateTokens(tokens);

    expect(valid).toBe(false);
  });
});
