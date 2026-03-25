import type { Platform } from "../types";
import { createLinkedInAdapter } from "./linkedin";
import { createTwitterAdapter } from "./twitter";
import type { PlatformAdapter } from "./types";
import { createYouTubeAdapter } from "./youtube";

// biome-ignore lint/performance/noBarrelFile: adapter entry point — consumers import from @allonfire/social-publisher/adapters
export { createLinkedInAdapter } from "./linkedin";
export { createTwitterAdapter } from "./twitter";
export type { PlatformAdapter } from "./types";
export { createYouTubeAdapter } from "./youtube";

const adapterMap: Record<string, () => PlatformAdapter> = {
  TWITTER: createTwitterAdapter,
  LINKEDIN: createLinkedInAdapter,
  YOUTUBE: createYouTubeAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const factory = adapterMap[platform];
  if (!factory) {
    throw new Error(`No adapter available for platform: ${platform}`);
  }
  return factory();
}
