import type { Platform } from "@allonfire/database";
import { linkedinRules } from "./linkedin";
import { twitterRules } from "./twitter";
import { youtubeRules } from "./youtube";

export const PLATFORM_RULES: Record<Platform, string> = {
  LINKEDIN: linkedinRules,
  TWITTER: twitterRules,
  YOUTUBE: youtubeRules,
};

export function getPlatformRules(platform: Platform): string {
  return PLATFORM_RULES[platform];
}
