import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { resizeAllForPlatform, resizeForPlatform } from "./resize";

function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("resizeForPlatform", () => {
  it("resizes large image to fit within platform specs", async () => {
    const input = await createTestImage(2000, 2000);
    const output = await resizeForPlatform(input, "TWITTER");
    const meta = await sharp(output).metadata();

    expect(meta.width).toBeLessThanOrEqual(1200);
    expect(meta.height).toBeLessThanOrEqual(675);
  });

  it("does not enlarge small images", async () => {
    const input = await createTestImage(100, 100);
    const output = await resizeForPlatform(input, "TWITTER");
    const meta = await sharp(output).metadata();

    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it("throws for unknown platform", async () => {
    const input = await createTestImage(200, 200);

    await expect(
      resizeForPlatform(input, "YOUTUBE" as unknown as "TWITTER")
    ).rejects.toThrow("No image spec defined for platform: YOUTUBE");
  });
});

describe("resizeAllForPlatform", () => {
  it("processes multiple images", async () => {
    const img1 = await createTestImage(300, 300);
    const img2 = await createTestImage(400, 400);

    const results = await resizeAllForPlatform(
      [
        { buffer: img1, mimeType: "image/png" },
        { buffer: img2, mimeType: "image/png" },
      ],
      "TWITTER"
    );

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.buffer).toBeInstanceOf(Buffer);
    }
  });
});
