import type { Platform } from "@allonfire/database";
import { linkedinRules } from "./linkedin";
import { tiktokRules } from "./tiktok";
import { twitterRules } from "./twitter";
import { youtubeRules } from "./youtube";

export const PLATFORM_RULES: Record<Platform, string> = {
  LINKEDIN: linkedinRules,
  TWITTER: twitterRules,
  YOUTUBE: youtubeRules,
  TIKTOK: tiktokRules,
};

export function getPlatformRules(platform: Platform): string {
  return PLATFORM_RULES[platform];
}
