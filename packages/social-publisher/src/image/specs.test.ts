import { describe, expect, it } from "vitest";
import { PLATFORM_IMAGE_SPECS } from "./specs";

describe("PLATFORM_IMAGE_SPECS", () => {
  const platforms = Object.keys(PLATFORM_IMAGE_SPECS) as Array<
    keyof typeof PLATFORM_IMAGE_SPECS
  >;

  it("has maxWidth > 0 for each platform", () => {
    for (const platform of platforms) {
      expect(PLATFORM_IMAGE_SPECS[platform].maxWidth).toBeGreaterThan(0);
    }
  });

  it("has maxHeight > 0 for each platform", () => {
    for (const platform of platforms) {
      expect(PLATFORM_IMAGE_SPECS[platform].maxHeight).toBeGreaterThan(0);
    }
  });

  it("has maxSizeKb > 0 for each platform", () => {
    for (const platform of platforms) {
      expect(PLATFORM_IMAGE_SPECS[platform].maxSizeKb).toBeGreaterThan(0);
    }
  });

  it("has at least one format for each platform", () => {
    for (const platform of platforms) {
      expect(PLATFORM_IMAGE_SPECS[platform].formats.length).toBeGreaterThan(0);
    }
  });

  it("includes webp for Twitter but not LinkedIn", () => {
    expect(PLATFORM_IMAGE_SPECS.TWITTER.formats).toContain("webp");
    expect(PLATFORM_IMAGE_SPECS.LINKEDIN.formats).not.toContain("webp");
  });

  it("includes jpeg for all platforms", () => {
    for (const platform of platforms) {
      expect(PLATFORM_IMAGE_SPECS[platform].formats).toContain("jpeg");
    }
  });
});
