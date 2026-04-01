import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./encryption";

const TEST_KEY = "a".repeat(64);

describe("encryption", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it("round-trips encrypt then decrypt", () => {
    const plaintext = "hello world, this is a secret!";
    const ciphertext = encrypt(plaintext);
    const result = decrypt(ciphertext);
    expect(result).toBe(plaintext);
  });

  it("produces different ciphertext each call due to random IV", () => {
    const plaintext = "same input every time";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const ciphertext = encrypt("sensitive data");
    const buf = Buffer.from(ciphertext, "base64");
    // Flip last byte to corrupt the auth tag
    const lastIdx = buf.length - 1;
    buf[lastIdx] = (buf.at(-1) ?? 0) === 0 ? 1 : 0;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    process.env.ENCRYPTION_KEY = "";
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY env var must be a 64-character hex string"
    );
  });

  it("throws when ENCRYPTION_KEY is too short", () => {
    process.env.ENCRYPTION_KEY = "abcd";
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY env var must be a 64-character hex string"
    );
  });
});
