import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedTokens, PublishRequest } from "../types";

const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockAction = vi.fn();

vi.mock("linkedin-api-client", () => {
  return {
    RestliClient: class MockRestliClient {
      get = mockGet;
      create = mockCreate;
      action = mockAction;
    },
  };
});

const { createLinkedInAdapter } = await import("./linkedin");

const tokens: DecryptedTokens = { accessToken: "test-token" };
const request: PublishRequest = { content: "Hello LinkedIn!" };

describe("createLinkedInAdapter", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockCreate.mockReset();
    mockAction.mockReset();
  });

  it("publishes text post and returns URN + URL", async () => {
    mockGet.mockResolvedValue({ data: { sub: "person-123" } });
    mockCreate.mockResolvedValue({
      createdEntityId: "urn:li:ugcPost:12345",
    });

    const adapter = createLinkedInAdapter();
    const result = await adapter.publish(request, tokens);

    expect(result).toEqual({
      success: true,
      platformPostId: "urn:li:ugcPost:12345",
      platformUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:12345",
    });
  });

  it("returns error on API failure", async () => {
    mockGet.mockRejectedValue(new Error("LinkedIn API error"));

    const adapter = createLinkedInAdapter();
    const result = await adapter.publish(request, tokens);

    expect(result.success).toBe(false);
    expect(result.error).toContain("LinkedIn API error");
  });

  it("validates tokens successfully", async () => {
    mockGet.mockResolvedValue({ data: { sub: "person-123" } });

    const adapter = createLinkedInAdapter();
    const valid = await adapter.validateTokens(tokens);

    expect(valid).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({
        resourcePath: "/userinfo",
        accessToken: "test-token",
      })
    );
  });

  it("validates tokens returns false on failure", async () => {
    mockGet.mockRejectedValue(new Error("Unauthorized"));

    const adapter = createLinkedInAdapter();
    const valid = await adapter.validateTokens(tokens);

    expect(valid).toBe(false);
  });
});
