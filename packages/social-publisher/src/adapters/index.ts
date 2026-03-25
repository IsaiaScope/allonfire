import type { Platform } from "../types";
import { createLinkedInAdapter } from "./linkedin";
import { createTwitterAdapter } from "./twitter";
import type { PlatformAdapter } from "./types";

// biome-ignore lint/performance/noBarrelFile: adapter entry point — consumers import from @allonfire/social-publisher/adapters
export { createLinkedInAdapter } from "./linkedin";
export { createTwitterAdapter } from "./twitter";
export type { PlatformAdapter } from "./types";

const adapterMap: Record<string, () => PlatformAdapter> = {
  TWITTER: createTwitterAdapter,
  LINKEDIN: createLinkedInAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const factory = adapterMap[platform];
  if (!factory) {
    throw new Error(`No adapter available for platform: ${platform}`);
  }
  return factory();
}
