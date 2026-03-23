import type { Platform } from "@allonfire/database";
import { resizeForPlatform } from "./resize";

// biome-ignore lint/performance/noBarrelFile: image module entry point
export { resizeForPlatform } from "./resize";
export type { ImageSpec } from "./specs";
export { PLATFORM_IMAGE_SPECS } from "./specs";

export async function resizeForPlatforms(
  imageBuffer: Buffer,
  platforms: Platform[]
): Promise<Map<Platform, Buffer>> {
  const entries = await Promise.all(
    platforms.map(async (platform) => {
      const resized = await resizeForPlatform(imageBuffer, platform);
      return [platform, resized] as const;
    })
  );

  return new Map(entries);
}
