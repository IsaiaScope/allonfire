import { describe, expect, it, vi } from "vitest";

const mockEnv = { N8N_API_KEY: "test-api-key" };

vi.mock("@/env", () => ({
  env: mockEnv,
}));

const { validateBearerToken } = await import("./api-auth");

const makeRequest = (authHeader?: string): Request => {
  const headers = new Headers();
  if (authHeader !== undefined) {
    headers.set("Authorization", authHeader);
  }
  return new Request("http://localhost/api/test", { headers });
};

const MISSING_OR_INVALID = /Missing or invalid/;
const INVALID_TOKEN = /Invalid token/;
const NOT_CONFIGURED = /not configured/;

describe("validateBearerToken", () => {
  it("returns null for a valid bearer token", () => {
    const result = validateBearerToken(makeRequest("Bearer test-api-key"));
    expect(result).toBeNull();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const result = validateBearerToken(makeRequest());
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    const body = await result?.json();
    expect(body.error).toMatch(MISSING_OR_INVALID);
  });

  it("returns 401 when token is wrong", async () => {
    const result = validateBearerToken(makeRequest("Bearer wrong-key"));
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    const body = await result?.json();
    expect(body.error).toMatch(INVALID_TOKEN);
  });

  it("returns 401 when Bearer prefix is present but token is empty", () => {
    const result = validateBearerToken(makeRequest("Bearer "));
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("returns 401 when Authorization header lacks Bearer prefix", () => {
    const result = validateBearerToken(makeRequest("Basic test-api-key"));
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("returns 500 when N8N_API_KEY is undefined", async () => {
    const original = mockEnv.N8N_API_KEY;
    // @ts-expect-error — intentionally setting to undefined for test
    mockEnv.N8N_API_KEY = undefined;
    try {
      const result = validateBearerToken(makeRequest("Bearer test-api-key"));
      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      const body = await result?.json();
      expect(body.error).toMatch(NOT_CONFIGURED);
    } finally {
      mockEnv.N8N_API_KEY = original;
    }
  });
});
