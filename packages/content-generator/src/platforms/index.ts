import type { Platform } from "@allonfire/database";
import { linkedinRules } from "./linkedin.js";
import { tiktokRules } from "./tiktok.js";
import { twitterRules } from "./twitter.js";
import { youtubeRules } from "./youtube.js";

export const PLATFORM_RULES: Record<Platform, string> = {
  LINKEDIN: linkedinRules,
  TWITTER: twitterRules,
  YOUTUBE: youtubeRules,
  TIKTOK: tiktokRules,
};

export function getPlatformRules(platform: Platform): string {
  return PLATFORM_RULES[platform];
}
