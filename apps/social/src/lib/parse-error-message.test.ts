import { describe, expect, it } from "vitest";
import { parseErrorMessage } from "./parse-error-message";

describe("parseErrorMessage", () => {
  it("returns plain strings unchanged", () => {
    expect(parseErrorMessage("Something went wrong")).toBe(
      "Something went wrong"
    );
  });

  it("extracts message from JSON error body", () => {
    const raw = JSON.stringify({
      error: { message: "Invalid API key", code: 401 },
    });
    expect(parseErrorMessage(raw)).toBe("Invalid API key (401)");
  });

  it("extracts top-level message from JSON", () => {
    const raw = JSON.stringify({ message: "Not found" });
    expect(parseErrorMessage(raw)).toBe("Not found");
  });

  it("strips leading HTTP status code before JSON", () => {
    const raw =
      '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_abc"}';
    expect(parseErrorMessage(raw)).toBe(
      "invalid x-api-key (authentication_error)"
    );
  });

  it("uses error.type as code fallback (Anthropic format)", () => {
    const raw = JSON.stringify({
      error: { type: "rate_limit_error", message: "Too many requests" },
    });
    expect(parseErrorMessage(raw)).toBe("Too many requests (rate_limit_error)");
  });

  it("prefers error.code over error.type", () => {
    const raw = JSON.stringify({
      error: { code: 429, type: "rate_limit_error", message: "Slow down" },
    });
    expect(parseErrorMessage(raw)).toBe("Slow down (429)");
  });

  it("handles status code prefix with space-separated JSON", () => {
    const raw =
      '500 {"error":{"message":"Internal server error","status":500}}';
    expect(parseErrorMessage(raw)).toBe("Internal server error (500)");
  });

  it("returns raw string when JSON has no recognizable fields", () => {
    const raw = JSON.stringify({ foo: "bar" });
    expect(parseErrorMessage(raw)).toBe(raw);
  });

  it("handles empty string", () => {
    expect(parseErrorMessage("")).toBe("");
  });
});
